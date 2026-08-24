[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $SnapshotPath,
    [ValidateRange(0, 1009)]
    [int] $FailureAfter = 0
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$LocalEvidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot '.local-evidence'))
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$RestoreScriptPath = Join-Path $WordPressDirectory 'seed/restore-public-routes.php'

function Resolve-SafeLocalPath {
    param(
        [Parameter(Mandatory = $true)] [string] $Path,
        [Parameter(Mandatory = $true)] [string] $AllowedRoot,
        [switch] $MustExist
    )
    if ([string]::IsNullOrWhiteSpace($Path)) { throw 'A local path is required.' }
    $FullPath = [System.IO.Path]::GetFullPath($Path)
    $FullAllowedRoot = [System.IO.Path]::GetFullPath($AllowedRoot).TrimEnd('\', '/')
    $AllowedPrefix = $FullAllowedRoot + [System.IO.Path]::DirectorySeparatorChar
    if (
        -not $FullPath.Equals($FullAllowedRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        -not $FullPath.StartsWith($AllowedPrefix, [System.StringComparison]::OrdinalIgnoreCase)
    ) {
        throw "Unsafe local path outside the allowed evidence directory: $FullPath"
    }
    if ($MustExist -and -not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
        throw "Required local file does not exist: $FullPath"
    }
    return $FullPath
}

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
$SnapshotPath = Resolve-SafeLocalPath -Path $SnapshotPath -AllowedRoot $LocalEvidenceRoot -MustExist
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
