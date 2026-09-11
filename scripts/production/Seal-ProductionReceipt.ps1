[CmdletBinding()]
param([Parameter(Mandatory)] [string] $RunRoot)

$ErrorActionPreference = 'Stop'
$names = @(
    'release-manifest.json',
    'release-proof.json',
    'production-surface.json',
    'production-live-forms.json',
    'production-inbox.json',
    'production-public-verification.json'
)
$paths = @{}
$values = @{}
foreach ($name in $names) {
    $path = Join-Path $RunRoot $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required production evidence is missing: $name" }
    $paths[$name] = $path
    $values[$name] = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}
$outputPath = Join-Path $RunRoot 'production-release-receipt.json'
if (Test-Path -LiteralPath $outputPath) { throw 'Final production receipt already exists; preserve the original evidence.' }

$manifest = $values['release-manifest.json']
$proof = $values['release-proof.json']
$surface = $values['production-surface.json']
$forms = $values['production-live-forms.json']
$inbox = $values['production-inbox.json']
$public = $values['production-public-verification.json']
$siteId = $manifest.siteId
$commit = $manifest.commit
if ($siteId -notmatch '^[a-z0-9-]+$' -or $commit -notmatch '^[a-f0-9]{40}$' -or $manifest.archiveSha256 -notmatch '^[a-f0-9]{64}$') {
    throw 'Release manifest identity is invalid.'
}
foreach ($value in @($proof, $surface, $forms, $inbox, $public)) {
    if ($value.siteId -cne $siteId -or $value.commit -cne $commit) { throw 'Production evidence identity mismatch.' }
}
if ($proof.prerelease.state -cne 'PASSED' -or $proof.prerelease.commit -cne $commit -or
    $proof.prerelease.buildId -cne $public.buildId -or $proof.prerelease.cmsIdentitySha256 -notmatch '^[a-f0-9]{64}$') {
    throw 'Prerelease proof does not bind the public runtime.'
}
if ($surface.registeredObjects -ne 58 -or $surface.browserCases -ne 174 -or $surface.passed -ne 174 -or
    $surface.failed -ne 0 -or $surface.externalPostCount -ne 0) { throw 'Production surface evidence is incomplete.' }

$attempts = @($forms.attempts)
$receipts = @($inbox.receipts)
$required = @('documents', 'rfq', 'sample')
if ($attempts.Count -ne 3 -or $receipts.Count -ne 3 -or ((@($attempts.workflow | Sort-Object -Unique) -join ',') -cne ($required -join ','))) {
    throw 'Production form evidence must contain exactly three workflows.'
}
$formSummary = foreach ($workflow in $required) {
    $attempt = @($attempts | Where-Object workflow -CEQ $workflow)
    $receipt = @($receipts | Where-Object workflow -CEQ $workflow)
    if ($attempt.Count -ne 1 -or $receipt.Count -ne 1 -or $attempt[0].httpStatus -ne 200 -or
        $attempt[0].providerCategory -cne 'accepted' -or -not $receipt[0].received -or
        $receipt[0].requestToken -cne $attempt[0].requestToken -or -not $receipt[0].confirmedAtUtc) {
        throw "Production form or inbox evidence is incomplete for $workflow."
    }
    $confirmedAtUtc = ([DateTimeOffset]$receipt[0].confirmedAtUtc).ToUniversalTime().ToString('o')
    [ordered]@{workflow=$workflow;requestToken=$attempt[0].requestToken;provider='ACCEPTED';inbox='RECEIVED';confirmedAtUtc=$confirmedAtUtc}
}
if ($public.state -cne 'PUBLIC_VERIFIED' -or $public.activeBaselineSha256 -notmatch '^[a-f0-9]{64}$' -or
    $public.sourceEvidenceSha256 -notmatch '^[a-f0-9]{64}$' -or $public.releaseHeader -cne $commit -or
    $public.releaseHeaderCount -ne 1 -or $public.checks.apex -ne 200 -or $public.checks.about -ne 200 -or
    $public.checks.markets -ne 200 -or $public.checks.www -notin @(301, 308) -or $public.checks.cms -ne 200) {
    throw 'Public production verification is incomplete.'
}

$hashes = [ordered]@{}
foreach ($name in $names) {
    $key = [IO.Path]::GetFileNameWithoutExtension($name) -replace '^production-', '' -replace '-', '_'
    $hashes[$key] = (Get-FileHash -LiteralPath $paths[$name] -Algorithm SHA256).Hash.ToLowerInvariant()
}
$value = [ordered]@{
    schemaVersion = 'tio2-production-release-receipt-v1'
    state = 'PRODUCTION_VERIFIED'
    siteId = $siteId
    commit = $commit
    archiveSha256 = $manifest.archiveSha256
    buildId = $public.buildId
    cmsIdentitySha256 = $proof.prerelease.cmsIdentitySha256
    activeBaselineSha256 = $public.activeBaselineSha256
    backupId = $public.backupId
    counts = [ordered]@{registeredObjects=58;browserCases=174;providerAccepted=3;inboxReceived=3}
    forms = @($formSummary)
    public = [ordered]@{releaseHeaderCount=1;checks=$public.checks}
    evidenceSha256 = $hashes
    sealedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
}
$json = $value | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($outputPath, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
Write-Output $outputPath
