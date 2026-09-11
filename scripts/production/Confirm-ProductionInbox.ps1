[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $RunRoot,
    [switch] $ConfirmAllReceived,
    [string] $ConfirmedAtUtc
)

$ErrorActionPreference = 'Stop'
$livePath = Join-Path $RunRoot 'production-live-forms.json'
$outputPath = Join-Path $RunRoot 'production-inbox.json'
if (-not (Test-Path -LiteralPath $livePath -PathType Leaf)) { throw 'Production live-form evidence is missing.' }
if (Test-Path -LiteralPath $outputPath) { throw 'Production inbox confirmation already exists; preserve the original evidence.' }

$live = Get-Content -LiteralPath $livePath -Raw | ConvertFrom-Json
if ($live.siteId -notmatch '^[a-z0-9-]+$' -or $live.commit -notmatch '^[a-f0-9]{40}$') { throw 'Production form identity is invalid.' }
$attempts = @($live.attempts)
$required = @('documents', 'rfq', 'sample')
if ($attempts.Count -ne 3 -or ((@($attempts.workflow | Sort-Object -Unique) -join ',') -cne ($required -join ','))) {
    throw 'Exactly one RFQ, Sample and Documents attempt is required.'
}
foreach ($attempt in $attempts) {
    if ($attempt.requestToken -notmatch '^[0-9a-fA-F-]{36}$' -or $attempt.httpStatus -ne 200 -or $attempt.providerCategory -cne 'accepted') {
        throw 'Only provider-accepted token-bound attempts can be confirmed.'
    }
}

function Convert-UtcTimestamp([string] $Value) {
    if ($Value -notmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,7})?(Z|\+00:00)$') { throw 'Confirmation time must explicitly be UTC.' }
    return [DateTimeOffset]::Parse($Value, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime().ToString('o')
}

$sharedTime = $null
if ($ConfirmAllReceived) {
    if (-not $ConfirmedAtUtc) { throw 'ConfirmedAtUtc is required with ConfirmAllReceived.' }
    $sharedTime = Convert-UtcTimestamp $ConfirmedAtUtc
}

$receipts = foreach ($attempt in $attempts) {
    if ($ConfirmAllReceived) {
        $received = $true
        $confirmed = $sharedTime
    } else {
        $answer = Read-Host "Inbox received for $($attempt.workflow) / $($attempt.requestToken)? [yes/no]"
        if ($answer -notin @('yes', 'no')) { throw 'Answer must be yes or no.' }
        $received = $answer -eq 'yes'
        $confirmed = $null
        if ($received) { $confirmed = Convert-UtcTimestamp (Read-Host 'UTC confirmation time (ISO 8601 ending Z or +00:00)') }
    }
    [ordered]@{workflow=$attempt.workflow;requestToken=$attempt.requestToken;received=$received;confirmedAtUtc=$confirmed}
}

$value = [ordered]@{
    schemaVersion = 'tio2-production-inbox-v1'
    siteId = $live.siteId
    commit = $live.commit
    receipts = @($receipts)
}
$json = $value | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText($outputPath, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
Write-Output $outputPath
