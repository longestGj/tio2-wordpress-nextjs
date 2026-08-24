[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $SnapshotPath,
    [ValidateRange(0, 1009)]
    [int] $FailureAfter = 0,
    [ValidateRange(0, 1009)]
    [int] $RollbackFailureAt = 0,
    [switch] $PostflightFailure
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$LocalEvidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot '.local-evidence'))
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$RestoreScriptPath = Join-Path $WordPressDirectory 'seed/restore-public-routes.php'
$EvidencePathLibrary = Join-Path $PSScriptRoot 'root-only-evidence-paths.ps1'
. $EvidencePathLibrary

function ConvertTo-ContainerPath {
    param([Parameter(Mandatory = $true)] [string] $LocalPath)
    $FullPath = [System.IO.Path]::GetFullPath($LocalPath)
    $RepositoryPrefix = $RepositoryRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    if (-not $FullPath.StartsWith($RepositoryPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Container path must resolve inside the current worktree: $FullPath"
    }
    return '/workspace/' + $FullPath.Substring($RepositoryPrefix.Length).Replace('\', '/')
}

foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $RestoreScriptPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) {
        throw "Missing required local root-only restore file: $RequiredFile"
    }
}
Assert-Tio2NoReparsePointChain -Path $RepositoryRoot
if (-not (Test-Path -LiteralPath $LocalEvidenceRoot)) {
    throw "Local evidence root does not exist: $LocalEvidenceRoot"
}
$SnapshotPath = Resolve-Tio2SafeLocalPath -Path $SnapshotPath -AllowedRoot $LocalEvidenceRoot -MustExist
if ([System.IO.Path]::GetExtension($SnapshotPath) -ne '.json') {
    throw 'Restore requires a local JSON snapshot.'
}
$ContainerSnapshotPath = ConvertTo-ContainerPath -LocalPath $SnapshotPath
$DockerArguments = @(
    'compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile,
    'run', '--rm', '--no-TTY', '--user', '33:33', 'wpcli',
    'wp', 'eval-file', '/workspace/wordpress/seed/restore-public-routes.php',
    $ContainerSnapshotPath
)
if ($FailureAfter -gt 0) { $DockerArguments += "failure-after=$FailureAfter" }
if ($RollbackFailureAt -gt 0) { $DockerArguments += "rollback-failure-at=$RollbackFailureAt" }
if ($PostflightFailure) { $DockerArguments += 'postflight-failure' }

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $Output = & docker @DockerArguments 2>&1
    $ExitCode = $LASTEXITCODE
}
finally { $ErrorActionPreference = $PreviousErrorActionPreference }
if ($ExitCode -ne 0) {
    foreach ($Line in $Output) { [Console]::Error.WriteLine($Line) }
    throw "Local WordPress CLI restore failed with exit code $ExitCode."
}
$CombinedOutput = $Output -join "`n"
$ResultMatches = [regex]::Matches($CombinedOutput, 'TIO2_ROOT_ONLY_RESULT\s+(\{[^\r\n]+\})')
if ($ResultMatches.Count -ne 1) {
    throw 'Restore operation did not return exactly one machine result.'
}
$Result = $ResultMatches[0].Groups[1].Value | ConvertFrom-Json
$Result | Add-Member -NotePropertyName snapshotPath -NotePropertyValue $SnapshotPath -Force
Write-Output "TIO2_ROOT_ONLY_RESULT $($Result | ConvertTo-Json -Depth 10 -Compress)"
