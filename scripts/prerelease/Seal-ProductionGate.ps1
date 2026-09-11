[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $TestReceiptPath,
    [Parameter(Mandatory)] [string] $LiveFormsReceiptPath,
    [Parameter(Mandatory)] [string] $InboxReceiptPath,
    [Parameter(Mandatory)] [string] $OutputPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Read-JsonStrict([string] $Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'Required Gate A evidence is missing.' }
    $python = @'
import json, sys
def reject_duplicates(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError("duplicate JSON member")
        value[key] = item
    return value
with open(sys.argv[1], "r", encoding="utf-8-sig") as stream:
    value = json.load(stream, object_pairs_hook=reject_duplicates)
sys.stdout.write(json.dumps(value, separators=(",", ":"), ensure_ascii=False))
'@
    $parserPath = [IO.Path]::GetTempFileName() + '.py'
    try {
        [IO.File]::WriteAllText($parserPath, $python, [Text.UTF8Encoding]::new($false))
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $normalized = @(& python $parserPath $Path 2>$null)
            $parserExit = $LASTEXITCODE
        }
        finally { $ErrorActionPreference = $previousPreference }
    }
    finally {
        Remove-Item -LiteralPath $parserPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath ($parserPath -replace '\.py$', '') -Force -ErrorAction SilentlyContinue
    }
    if ($parserExit -ne 0 -or $normalized.Count -ne 1) { throw 'Gate A evidence is not strict JSON.' }
    try { return ($normalized[0] | ConvertFrom-Json -ErrorAction Stop) }
    catch { throw 'Gate A evidence is not strict JSON.' }
}

function Get-Sha256([string] $Path) {
    $stream = [IO.File]::OpenRead((Resolve-Path -LiteralPath $Path).Path)
    try {
        $algorithm = [Security.Cryptography.SHA256]::Create()
        try { return ([BitConverter]::ToString($algorithm.ComputeHash($stream)) -replace '-', '').ToLowerInvariant() }
        finally { $algorithm.Dispose() }
    }
    finally { $stream.Dispose() }
}

function Get-GitBlobSha256([string] $RepositoryRoot, [string] $Commit, [string] $Path) {
    if ($Commit -notmatch '^[a-f0-9]{40}$' -or $Path -notmatch '^(?!/)(?!.*(?:^|/)\.\.(?:/|$))[A-Za-z0-9._/-]+$') { throw 'Gate A Git identity is invalid.' }
    $quote = { param([string] $Value) '"' + ($Value -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"' }
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = 'git'; $startInfo.UseShellExecute = $false; $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true; $startInfo.RedirectStandardError = $true
    $startInfo.Arguments = (@('-C', $RepositoryRoot, 'cat-file', 'blob', "$Commit`:$Path") | ForEach-Object { & $quote $_ }) -join ' '
    $process = [Diagnostics.Process]::new(); $process.StartInfo = $startInfo
    if (-not $process.Start()) { throw 'Failed to read the Gate A Git identity.' }
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { $digest = ([BitConverter]::ToString($algorithm.ComputeHash($process.StandardOutput.BaseStream)) -replace '-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
    $errorText = $process.StandardError.ReadToEnd(); $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'Failed to read the Gate A Git identity.' }
    return $digest
}

function Assert-ExactStrings([object[]] $Actual, [string[]] $Expected, [string] $Message) {
    $values = @($Actual | ForEach-Object { [string] $_ })
    if ($values.Count -ne $Expected.Count -or @($values | Select-Object -Unique).Count -ne $values.Count -or @(Compare-Object $values $Expected -CaseSensitive).Count -ne 0) {
        throw $Message
    }
}

function Assert-Identity([object] $Value, [string] $Action) {
    if ($Value.schemaVersion -ne 2 -or $Value.action -cne $Action -or $Value.state -cne 'PASSED' -or $Value.evidenceValid -isnot [bool] -or -not $Value.evidenceValid -or $Value.testExit -ne 0 -or
        $Value.siteId -cne 'tio2-my' -or $Value.candidateCommit -notmatch '^[a-f0-9]{40}$' -or [string]::IsNullOrWhiteSpace([string] $Value.runId) -or
        [string]::IsNullOrWhiteSpace([string] $Value.buildId) -or $Value.cmsIdentitySha256 -notmatch '^[a-f0-9]{64}$' -or $Value.releaseSurfaceSha256 -notmatch '^[a-f0-9]{64}$') {
        throw 'Gate A evidence is not a completed passing candidate result.'
    }
}

$test = Read-JsonStrict $TestReceiptPath
$live = Read-JsonStrict $LiveFormsReceiptPath
$inbox = Read-JsonStrict $InboxReceiptPath
Assert-Identity $test 'Test'
Assert-Identity $live 'TestLiveForms'

$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$surfaceSha256 = Get-GitBlobSha256 $repositoryRoot $test.candidateCommit 'ops/production/release-surface.json'
$identityFields = @('candidateCommit', 'runId', 'buildId', 'cmsIdentitySha256', 'releaseSurfaceSha256')
foreach ($field in $identityFields) {
    if ([string] $test.$field -cne [string] $live.$field) { throw 'Gate A evidence identities do not match.' }
}
if ($test.releaseSurfaceSha256 -cne $surfaceSha256) { throw 'Gate A release surface does not match the reviewed inventory.' }

$ordinaryChecks = @(
    'smoke.representative', 'smoke.local-forms', 'smoke.cookie-keyboard',
    'smoke.reflow.1440', 'smoke.reflow.768', 'smoke.reflow.390',
    'public-paths.width.1440', 'public-paths.width.768', 'public-paths.width.390',
    'public-paths.internal-links.58'
)
Assert-ExactStrings @($test.requiredCheckIds) $ordinaryChecks 'Gate A ordinary check scope is incomplete.'
Assert-ExactStrings @($test.completedCheckIds) $ordinaryChecks 'Gate A ordinary checks did not all pass.'
if ($test.externalPostCount -ne 0 -or $test.inventory.registeredObjects -ne 58) { throw 'Gate A ordinary test counts are invalid.' }

$workflowNames = @('rfq', 'sample', 'documents')
$liveChecks = @($workflowNames | ForEach-Object { "live-forms.$_" })
Assert-ExactStrings @($live.requiredCheckIds) $liveChecks 'Gate A live-form scope is incomplete.'
Assert-ExactStrings @($live.completedCheckIds) $liveChecks 'Gate A live-form checks did not all pass.'
if ($live.externalPostCount -ne 3 -or $live.transport.allowedPostCount -ne 3 -or $live.transport.blockedWriteCount -ne 0 -or $live.transport.status -cne 'PASSED') {
    throw 'Gate A live-form transport counts are invalid.'
}
$attempts = @($live.formAttempts)
if ($attempts.Count -ne 3) { throw 'Gate A requires exactly three live-form attempts.' }
Assert-ExactStrings @($attempts.workflow) $workflowNames 'Gate A live-form workflows are invalid.'
if (@($attempts.requestToken | Select-Object -Unique).Count -ne 3) { throw 'Gate A live-form request tokens are not unique.' }
foreach ($attempt in $attempts) {
    $expectedPage = @{rfq='CONV-RFQ';sample='CONV-SAMPLE';documents='CONV-DOC'}[[string] $attempt.workflow]
    $expectedThankYou = @{rfq='quote';sample='sample';documents='documents'}[[string] $attempt.workflow]
    if ($attempt.pageId -cne $expectedPage -or $attempt.requestToken -notmatch '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' -or
        $attempt.httpStatus -ne 200 -or $attempt.providerCategory -cne 'accepted' -or $attempt.thankYouRequest -cne $expectedThankYou) {
        throw 'Gate A contains an invalid live-form attempt.'
    }
}

if ($inbox.schemaVersion -ne 1 -or $inbox.candidateCommit -cne $test.candidateCommit) { throw 'Gate A inbox identity is invalid.' }
$receipts = @($inbox.receipts)
if ($receipts.Count -ne 3) { throw 'Gate A requires exactly three inbox confirmations.' }
Assert-ExactStrings @($receipts.workflow) $workflowNames 'Gate A inbox workflows are invalid.'
foreach ($receipt in $receipts) {
    $attempt = @($attempts | Where-Object { $_.workflow -ceq $receipt.workflow -and $_.requestToken -ceq $receipt.requestToken })
    if ($attempt.Count -ne 1 -or $receipt.received -isnot [bool] -or -not $receipt.received -or [string]::IsNullOrWhiteSpace([string] $receipt.receivedAt)) {
        throw 'Gate A inbox confirmation is missing or does not match its request.'
    }
    $receivedAt = [DateTimeOffset]::MinValue
    if ([string] $receipt.receivedAt -notmatch '(Z|\+00:00)$' -or -not [DateTimeOffset]::TryParse([string] $receipt.receivedAt, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind, [ref] $receivedAt)) {
        throw 'Gate A inbox confirmation time is invalid.'
    }
}

$output = [ordered]@{
    schemaVersion = 'tio2-prerelease-production-gate-v1'
    siteId = 'tio2-my'
    state = 'PASSED'
    commit = [string] $test.candidateCommit
    runId = [string] $test.runId
    buildId = [string] $test.buildId
    cmsIdentitySha256 = ([string] $test.cmsIdentitySha256).ToLowerInvariant()
    releaseSurfaceSha256 = $surfaceSha256
    sealedAt = [DateTimeOffset]::UtcNow.ToString('o')
    counts = [ordered]@{ businessPages = 56; registeredObjects = 58; widths = 3; browserCases = 174 }
    forms = [ordered]@{ rfq = 'RECEIVED'; sample = 'RECEIVED'; documents = 'RECEIVED' }
    evidenceSha256 = [ordered]@{
        test = Get-Sha256 $TestReceiptPath
        liveForms = Get-Sha256 $LiveFormsReceiptPath
        inbox = Get-Sha256 $InboxReceiptPath
    }
}

$parent = Split-Path -Parent ([IO.Path]::GetFullPath($OutputPath))
if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'Gate A output parent does not exist.' }
$stream = [IO.File]::Open($OutputPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
try {
    $writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false), 4096, $true)
    try { $writer.Write(($output | ConvertTo-Json -Depth 20 -Compress)); $writer.Flush() }
    finally { $writer.Dispose() }
}
finally { $stream.Dispose() }

[pscustomobject] $output | ConvertTo-Json -Depth 20 -Compress
