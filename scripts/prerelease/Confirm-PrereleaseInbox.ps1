[CmdletBinding()]
param([Parameter(Mandatory)] [string] $EvidenceRoot)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Prerelease.Core.psm1') -Force
$result = Get-Content -LiteralPath (Join-Path $EvidenceRoot 'result.json') -Raw | ConvertFrom-Json
if ($result.candidateCommit -notmatch '^[a-f0-9]{40}$') { throw 'A candidate commit is required.' }
$attempts = @($result.formAttempts)
if ($attempts.Count -ne 3 -or @($attempts.workflow | Select-Object -Unique).Count -ne 3 -or @($attempts.requestToken | Select-Object -Unique).Count -ne 3) { throw 'Exactly three unique workflow attempts are required.' }
foreach ($attempt in $attempts) {
    Assert-PrereleaseFormAttempt -Attempt $attempt
    if ($attempt.httpStatus -ne 200 -or $attempt.providerCategory -ne 'accepted' -or $attempt.thankYouRequest -ne @{rfq='quote';sample='sample';documents='documents'}[$attempt.workflow]) { throw 'Only provider-positive completed attempts can be correlated.' }
}
$outputPath = Join-Path $EvidenceRoot 'inbox-confirmation.json'
if (Test-Path -LiteralPath $outputPath) { throw 'Inbox confirmation already exists; preserve the original evidence.' }
$receipts = foreach ($attempt in $attempts) {
    $answer = Read-Host "Inbox received for $($attempt.workflow) / $($attempt.requestToken)? [yes/no]"
    if ($answer -notin @('yes','no')) { throw 'Answer must be yes or no.' }
    $received = $answer -eq 'yes'
    $receivedAt = $null
    if ($received) {
        $raw = Read-Host 'UTC receivedAt (ISO 8601 ending Z or +00:00)'
        if ($raw -notmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,7})?(Z|\+00:00)$') { throw 'receivedAt must explicitly be UTC.' }
        $receivedAt = [DateTimeOffset]::Parse($raw, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime().ToString('o')
    }
    [ordered]@{workflow=$attempt.workflow;requestToken=$attempt.requestToken;received=$received;receivedAt=$receivedAt}
}
Write-PrereleaseJsonFile -Value ([ordered]@{schemaVersion=1;candidateCommit=$result.candidateCommit;receipts=@($receipts)}) -Path $outputPath
