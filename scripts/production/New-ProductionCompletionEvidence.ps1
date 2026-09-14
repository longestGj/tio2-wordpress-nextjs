#requires -Version 7.2
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $RunRoot,
    [Parameter(Mandatory)] [string] $BusinessE2EPath,
    [Parameter(Mandatory)] [string] $InboxConfirmationPath,
    [Parameter(Mandatory)] [string] $RfqEmlPath,
    [Parameter(Mandatory)] [string] $SampleEmlPath,
    [Parameter(Mandatory)] [string] $DocumentsEmlPath
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'ReleaseCoverage.ps1')
$requiredForms = @('rfq', 'sample', 'documents')
$bindingNames = @(
    'releaseId', 'subject', 'releaseType', 'sourceCommit',
    'candidateManifestSha256', 'previousProductionReceipt', 'adapterVersion',
    'runRoot', 'transactionSha256', 'cmsEvidenceSha256', 'requestId'
)
$completionNames = @(
    'business-e2e-receipt.json', 'inbox-confirmation-receipt.json',
    'rfq-received.eml', 'sample-received.eml', 'documents-received.eml',
    'completion-receipt.json'
)

function Read-JsonObject([string] $Path, [string] $Label) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "$Label is missing." }
    try {
        $arguments = @{ AsHashtable = $true; ErrorAction = 'Stop' }
        if ((Get-Command ConvertFrom-Json).Parameters.ContainsKey('DateKind')) { $arguments.DateKind = 'String' }
        $value = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json @arguments
    }
    catch { throw "$Label is not valid JSON." }
    if ($value -isnot [Collections.IDictionary]) { throw "$Label must be a JSON object." }
    return $value
}

function Assert-ExactNames($Value, [string[]] $Names, [string] $Label) {
    if ($Value -isnot [Collections.IDictionary]) { throw "$Label must be an object." }
    $actual = @($Value.Keys | ForEach-Object { [string] $_ } | Sort-Object -CaseSensitive)
    $expected = @($Names | Sort-Object -CaseSensitive)
    if (@(Compare-Object $actual $expected -CaseSensitive).Count -ne 0) { throw "$Label fields are invalid." }
}

function Get-Sha256([string] $Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Test-UtcTimestamp([string] $Value) {
    if ($Value -notmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,7})?(Z|\+00:00)$') { return $false }
    try { $null = [DateTimeOffset]::Parse($Value, [Globalization.CultureInfo]::InvariantCulture) }
    catch { return $false }
    return $true
}

function Read-MessageHeaders([byte[]] $Bytes) {
    if ($Bytes.Count -eq 0 -or $Bytes.Count -gt 1MB) { throw 'Received message size is invalid.' }
    $text = [Text.Encoding]::UTF8.GetString($Bytes)
    if ($text.Contains([char] 0)) { throw 'Received message contains invalid bytes.' }
    $parts = [regex]::Split($text, "\r?\n\r?\n", 2)
    if ($parts.Count -ne 2) { throw 'Received message headers are required.' }
    $headers = [Collections.Generic.List[object]]::new()
    foreach ($line in [regex]::Split($parts[0], "\r?\n")) {
        if ($line -match '^[ \t]') {
            if ($headers.Count -eq 0) { throw 'Invalid received message header continuation.' }
            $headers[-1].value += ' ' + $line.Trim()
        } elseif ($line -match '^([!-9;-~]+):[ \t]*(.*)$') {
            $headers.Add(@{ name = $Matches[1]; value = $Matches[2].Trim() })
        } else { throw 'Invalid received message header.' }
    }
    return ,$headers
}

$RunRoot = [IO.Path]::GetFullPath($RunRoot).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
if (-not (Test-Path -LiteralPath $RunRoot -PathType Container)) { throw 'RunRoot is missing.' }

$destinations = @{}
foreach ($name in $completionNames) {
    $destinations[$name] = Join-Path $RunRoot $name
    if (Test-Path -LiteralPath $destinations[$name]) { throw "Completion evidence already exists: $name" }
}

$sourceMailPaths = @{
    rfq = [IO.Path]::GetFullPath($RfqEmlPath)
    sample = [IO.Path]::GetFullPath($SampleEmlPath)
    documents = [IO.Path]::GetFullPath($DocumentsEmlPath)
}
if (@($sourceMailPaths.Values | Select-Object -Unique).Count -ne 3) { throw 'Three distinct received message files are required.' }
foreach ($form in $requiredForms) {
    $source = $sourceMailPaths[$form]
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Received message is missing for $form." }
    if ($source -ceq [IO.Path]::GetFullPath($destinations[($form + '-received.eml')])) { throw 'Received message source cannot be a completion output.' }
}

$binding = Read-JsonObject (Join-Path $RunRoot 'frontend-binding.json') 'Frontend binding'
Assert-ExactNames $binding $bindingNames 'Frontend binding'
if ($binding.subject -cne 'tio2-my' -or $binding.releaseType -cne 'frontend-only' -or
    $binding.releaseId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$' -or
    $binding.sourceCommit -cnotmatch '^[a-f0-9]{40}$' -or
    $binding.candidateManifestSha256 -cnotmatch '^[a-f0-9]{64}$' -or
    $binding.transactionSha256 -cnotmatch '^[a-f0-9]{64}$' -or
    $binding.cmsEvidenceSha256 -cnotmatch '^[a-f0-9]{64}$' -or
    $binding.requestId -cnotmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$') {
    throw 'Frontend binding identity is invalid.'
}
$expectedRunRoot = '.production/runs/' + $binding.releaseId
$normalizedRunRoot = $RunRoot.Replace('\', '/')
if ($binding.runRoot -ceq ('frontend/' + $binding.releaseId)) {
    # New envelopes use a logical server run identity, not the client's directory.
    # Reuse full offline payload/proof validation; this invokes no transport.
    Import-Module (Join-Path $PSScriptRoot 'Production.Core.psm1') -Force
    $candidate = & (Get-Module Production.Core) { param($root, $site) Get-D16NewFrontendCandidate $root $site } $RunRoot $binding.subject
    foreach ($name in $candidate.Keys) {
        if ($candidate[$name] -cne $binding[$name]) { throw "Candidate binding mismatch: $name" }
    }
    $sourceManifest = Read-JsonObject (Join-Path $RunRoot 'payload/frontend/release-manifest.json') 'Source manifest'
    $sourceProof = Read-JsonObject (Join-Path $RunRoot 'payload/frontend/release-proof.json') 'Source proof'
} else {
    if ($binding.runRoot -cne $expectedRunRoot -or -not $normalizedRunRoot.EndsWith('/' + $expectedRunRoot, [StringComparison]::Ordinal)) { throw 'RunRoot does not match the release binding.' }
    if ((Get-Sha256 (Join-Path $RunRoot 'release-manifest.json')) -cne $binding.candidateManifestSha256) { throw 'Candidate manifest does not match the release binding.' }
    $sourceManifest = Read-JsonObject (Join-Path $RunRoot 'release-manifest.json') 'Source manifest'
}
$coverage = Get-ReleaseCoverageCounts $sourceManifest.releaseSurfaceSha256

$backup = Read-JsonObject (Join-Path $RunRoot 'frontend-backup.json') 'Frontend backup receipt'
if (-not $backup.backupId) { throw 'Frontend backup identity is missing.' }
foreach ($name in $bindingNames) {
    if ($backup.binding[$name] -cne $binding[$name]) { throw "Frontend backup binding mismatch: $name" }
}

$publicVerify = Read-JsonObject (Join-Path $RunRoot 'verify.json') 'First public Verify receipt'
if ($publicVerify.ok -isnot [bool] -or -not $publicVerify.ok -or $publicVerify.subject -cne $binding.subject -or
    $publicVerify.action -cne 'verify' -or $publicVerify.state.state -cne 'PUBLIC_VERIFIED') { throw 'First public Verify receipt is incomplete.' }
$details = $publicVerify.state.details
foreach ($name in $bindingNames) {
    if ($details[$name] -cne $binding[$name]) { throw "Public Verify binding mismatch: $name" }
}
$verifyEvidence = $details['actionEvidence']
if ($details.Contains('actionEvidence')) {
    if ($verifyEvidence -isnot [Collections.IDictionary]) { throw 'Public Verify action evidence must be an object.' }
    Assert-ExactNames $verifyEvidence @('active', 'binding', 'health', 'ok', 'publicVerified', 'state') 'Public Verify action evidence'
    if ($verifyEvidence.ok -isnot [bool] -or -not $verifyEvidence.ok -or
        $verifyEvidence.publicVerified -isnot [bool] -or -not $verifyEvidence.publicVerified -or
        $verifyEvidence.state -cne 'PUBLIC_VERIFIED') { throw 'Public Verify action evidence is incomplete.' }
    Assert-ExactNames $verifyEvidence.binding $bindingNames 'Public Verify action binding'
    foreach ($name in $bindingNames) {
        if ($verifyEvidence.binding[$name] -cne $binding[$name]) { throw "Public Verify action binding mismatch: $name" }
    }
    $active = $verifyEvidence.active
    Assert-ExactNames $verifyEvidence.health @('buildId', 'containerId', 'imageId', 'proxy') 'Public Verify health'
    if ($verifyEvidence.health.proxy -isnot [bool] -or -not $verifyEvidence.health.proxy) { throw 'Public Verify proxy health is incomplete.' }
    foreach ($name in @('buildId', 'containerId', 'imageId')) {
        if ($verifyEvidence.health[$name] -cne $active[$name]) { throw "Public Verify health mismatch: $name" }
    }
} else {
    $active = $details['activeFrontend']
}
Assert-ExactNames $active @('commit', 'sourceRoot', 'imageId', 'buildId', 'containerId') 'Active frontend identity'
if ($active.commit -cne $binding.sourceCommit -or $active.imageId -cnotmatch '^sha256:[a-f0-9]{64}$' -or
    $active.containerId -cnotmatch '^[a-f0-9]{64}$' -or -not $active.sourceRoot -or -not $active.buildId) { throw 'Active frontend identity does not match the candidate.' }
if ($binding.runRoot -ceq ('frontend/' + $binding.releaseId) -and $active.buildId -cne $sourceProof.buildId) { throw 'Active Build does not match the candidate proof.' }

$businessInput = Read-JsonObject ([IO.Path]::GetFullPath($BusinessE2EPath)) 'Business E2E evidence'
Assert-ExactNames $businessInput @('schemaVersion', 'siteId', 'commit', 'releaseId', 'candidateManifestSha256', 'cmsIdentitySha256', 'environment', 'suite', 'state', 'runId', 'counts', 'active') 'Business E2E evidence'
if ($businessInput.schemaVersion -cne 'd16-production-business-e2e-evidence-v1' -or
    $businessInput.siteId -cne $binding.subject -or $businessInput.commit -cne $binding.sourceCommit -or
    $businessInput.releaseId -cne $binding.releaseId -or
    $businessInput.candidateManifestSha256 -cne $binding.candidateManifestSha256 -or
    $businessInput.cmsIdentitySha256 -cne $binding.cmsEvidenceSha256 -or
    $businessInput.environment -cne 'production' -or $businessInput.suite -cne 'business-e2e' -or
    $businessInput.state -cne 'PASSED' -or $businessInput.runId -isnot [string] -or
    $businessInput.runId.Trim().Length -lt 1 -or $businessInput.runId.Trim().Length -gt 256) { throw 'Business E2E identity is invalid.' }
Assert-ExactNames $businessInput.counts @('registeredObjects', 'widths', 'browserCases', 'passed', 'failed', 'externalPostCount') 'Business E2E counts'
if ($businessInput.counts.registeredObjects -ne $coverage.registeredObjects -or $businessInput.counts.widths -ne $coverage.widths -or
    $businessInput.counts.browserCases -ne $coverage.browserCases -or $businessInput.counts.passed -ne $coverage.browserCases -or
    $businessInput.counts.failed -ne 0 -or $businessInput.counts.externalPostCount -ne 0) { throw 'Business E2E coverage is incomplete.' }
Assert-ExactNames $businessInput.active @('commit', 'sourceRoot', 'imageId', 'buildId', 'containerId') 'Business E2E active identity'
foreach ($name in @('commit', 'sourceRoot', 'imageId', 'buildId', 'containerId')) {
    if ($businessInput.active[$name] -cne $active[$name]) { throw "Business E2E active identity mismatch: $name" }
}

$live = Read-JsonObject (Join-Path $RunRoot 'production-live-forms.json') 'Production live-form evidence'
Assert-ExactNames $live @('schemaVersion', 'siteId', 'commit', 'attempts', 'counts') 'Production live-form evidence'
if ($live.schemaVersion -cne 'tio2-production-live-forms-evidence-v1' -or $live.siteId -cne $binding.subject -or $live.commit -cne $binding.sourceCommit) { throw 'Production live-form identity is invalid.' }
Assert-ExactNames $live.counts @('workflows', 'accepted', 'posts') 'Production live-form counts'
if ($live.counts.workflows -ne 3 -or $live.counts.accepted -ne 3 -or $live.counts.posts -ne 3) { throw 'Production live-form counts are incomplete.' }
$attempts = @($live.attempts)
if ($attempts.Count -ne 3 -or @($attempts.requestToken | Select-Object -Unique).Count -ne 3) { throw 'Exactly three distinct production form attempts are required.' }

$confirmation = Read-JsonObject ([IO.Path]::GetFullPath($InboxConfirmationPath)) 'Inbox confirmation input'
Assert-ExactNames $confirmation @('schemaVersion', 'siteId', 'commit', 'releaseId', 'forms') 'Inbox confirmation input'
if ($confirmation.schemaVersion -cne 'd16-production-inbox-confirmation-input-v1' -or
    $confirmation.siteId -cne $binding.subject -or $confirmation.commit -cne $binding.sourceCommit -or
    $confirmation.releaseId -cne $binding.releaseId) { throw 'Inbox confirmation identity is invalid.' }
Assert-ExactNames $confirmation.forms $requiredForms 'Inbox confirmation forms'

$mailBytes = @{}
$mailRecords = [ordered]@{}
$messageIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($form in $requiredForms) {
    $attempt = @($attempts | Where-Object { $_.workflow -ceq $form })
    if ($attempt.Count -ne 1) { throw "Production form attempt is missing for $form." }
    Assert-ExactNames $attempt[0] @('workflow', 'pageId', 'requestToken', 'httpStatus', 'providerCategory', 'thankYouRequest', 'timestamp') "Production form attempt for $form"
    $expectedPage = @{ rfq = 'CONV-RFQ'; sample = 'CONV-SAMPLE'; documents = 'CONV-DOC' }[$form]
    $expectedThankYou = @{ rfq = 'quote'; sample = 'sample'; documents = 'documents' }[$form]
    if ($attempt[0].pageId -cne $expectedPage) { throw "Production form page identity is invalid for $form." }
    if ($attempt[0].requestToken -cnotmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$') { throw "Production form request token is invalid for $form." }
    if ($attempt[0].httpStatus -ne 200 -or $attempt[0].providerCategory -cne 'accepted') { throw "Production form provider acceptance is invalid for $form." }
    if ($attempt[0].thankYouRequest -cne $expectedThankYou) { throw "Production form Thank You identity is invalid for $form." }
    if (-not (Test-UtcTimestamp $attempt[0].timestamp)) { throw "Production form timestamp is invalid for $form." }

    $confirmed = $confirmation.forms[$form]
    Assert-ExactNames $confirmed @('requestToken', 'received', 'confirmedAtUtc', 'recipient', 'subject') "Inbox confirmation for $form"
    if ($confirmed.requestToken -cne $attempt[0].requestToken -or $confirmed.received -isnot [bool] -or -not $confirmed.received -or
        -not (Test-UtcTimestamp $confirmed.confirmedAtUtc) -or $confirmed.recipient -isnot [string] -or
        $confirmed.subject -isnot [string] -or -not $confirmed.recipient.Trim() -or -not $confirmed.subject.Trim()) { throw "Inbox confirmation is incomplete for $form." }

    $bytes = [IO.File]::ReadAllBytes($sourceMailPaths[$form])
    $headers = Read-MessageHeaders $bytes
    $messageIdHeaders = @($headers | Where-Object { $_.name -ieq 'Message-ID' })
    $receivedHeaders = @($headers | Where-Object { $_.name -ieq 'Received' -and $_.value })
    $toHeaders = @($headers | Where-Object { $_.name -ieq 'To' })
    $subjectHeaders = @($headers | Where-Object { $_.name -ieq 'Subject' })
    if ($messageIdHeaders.Count -ne 1 -or $messageIdHeaders[0].value -cnotmatch '^<[^<>\s@]+@[^<>\s@]+>$' -or
        $receivedHeaders.Count -lt 1 -or $toHeaders.Count -ne 1 -or $subjectHeaders.Count -ne 1 -or
        $subjectHeaders[0].value -cne $confirmed.subject) { throw "Received message headers are invalid for $form." }
    try {
        $addresses = [Net.Mail.MailAddressCollection]::new()
        $addresses.Add($toHeaders[0].value)
    } catch { throw "Received message recipient is invalid for $form." }
    if (@($addresses | Where-Object { $_.Address -ieq $confirmed.recipient.Trim() }).Count -ne 1) { throw "Received message recipient does not match for $form." }
    if (-not $messageIds.Add($messageIdHeaders[0].value)) { throw 'Three distinct Message-ID values are required.' }
    $mailBytes[$form] = $bytes
    $mailRecords[$form] = [ordered]@{ state = 'RECEIVED'; messageId = $messageIdHeaders[0].value; emlSha256 = ([BitConverter]::ToString([Security.Cryptography.SHA256]::HashData($bytes))).Replace('-', '').ToLowerInvariant() }
}

$fields = [ordered]@{}
foreach ($name in $bindingNames) { $fields[$name] = $binding[$name] }
$fields.backupId = $backup.backupId
$businessReceipt = [ordered]@{}
foreach ($name in $fields.Keys) { $businessReceipt[$name] = $fields[$name] }
$businessReceipt.schemaVersion = 'd16-production-business-e2e-v1'
$businessReceipt.environment = 'production'
$businessReceipt.suite = 'business-e2e'
$businessReceipt.state = 'PASSED'
$businessReceipt.runId = $businessInput.runId

$inboxReceipt = [ordered]@{}
foreach ($name in $fields.Keys) { $inboxReceipt[$name] = $fields[$name] }
$inboxReceipt.schemaVersion = 'd16-production-inbox-v1'
$inboxReceipt.source = 'server-inbox'
$inboxReceipt.forms = $mailRecords

$stageRoot = Join-Path $RunRoot ('.completion-evidence-' + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($stageRoot) | Out-Null
$moved = [Collections.Generic.List[string]]::new()
try {
    $utf8 = [Text.UTF8Encoding]::new($false)
    [IO.File]::WriteAllText((Join-Path $stageRoot 'business-e2e-receipt.json'), ($businessReceipt | ConvertTo-Json -Depth 20) + [Environment]::NewLine, $utf8)
    foreach ($form in $requiredForms) { [IO.File]::WriteAllBytes((Join-Path $stageRoot ($form + '-received.eml')), $mailBytes[$form]) }
    [IO.File]::WriteAllText((Join-Path $stageRoot 'inbox-confirmation-receipt.json'), ($inboxReceipt | ConvertTo-Json -Depth 20) + [Environment]::NewLine, $utf8)

    $completion = [ordered]@{}
    foreach ($name in $fields.Keys) { $completion[$name] = $fields[$name] }
    $completion.schemaVersion = 'd16-release-completion-v1'
    $completion.businessE2E = 'PASSED'
    $completion.forms = [ordered]@{ rfq = 'RECEIVED'; sample = 'RECEIVED'; documents = 'RECEIVED' }
    $completion.evidenceSha256 = [ordered]@{}
    foreach ($name in @('business-e2e-receipt.json', 'inbox-confirmation-receipt.json', 'rfq-received.eml', 'sample-received.eml', 'documents-received.eml')) {
        $completion.evidenceSha256[$name] = Get-Sha256 (Join-Path $stageRoot $name)
    }
    [IO.File]::WriteAllText((Join-Path $stageRoot 'completion-receipt.json'), ($completion | ConvertTo-Json -Depth 20) + [Environment]::NewLine, $utf8)

    foreach ($name in $completionNames) {
        [IO.File]::Move((Join-Path $stageRoot $name), $destinations[$name], $false)
        $moved.Add($destinations[$name])
    }
} catch {
    foreach ($path in $moved) { if (Test-Path -LiteralPath $path -PathType Leaf) { Remove-Item -LiteralPath $path -Force } }
    throw
} finally {
    if (Test-Path -LiteralPath $stageRoot -PathType Container) { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
}

[ordered]@{ state = 'SEALED'; releaseId = $binding.releaseId; files = $completionNames } | ConvertTo-Json -Depth 4 -Compress
