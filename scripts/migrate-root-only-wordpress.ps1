[CmdletBinding()]
param(
    [string] $EvidenceDirectory = '',
    [string] $SnapshotPath = '',
    [switch] $DryRun,
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
$ExportScriptPath = Join-Path $WordPressDirectory 'seed/export-route-status-snapshot.php'
$RetireScriptPath = Join-Path $WordPressDirectory 'seed/retire-public-routes.php'

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
    $RelativePath = $FullPath.Substring($RepositoryPrefix.Length).Replace('\', '/')
    return "/workspace/$RelativePath"
}

function Invoke-LocalWpEvalFile {
    param(
        [Parameter(Mandatory = $true)] [string] $ContainerScript,
        [string[]] $ScriptArguments = @(),
        [switch] $SuppressOutput
    )
    $DockerArguments = @(
        'compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile,
        'run', '--rm', '--no-TTY', '--user', '33:33', 'wpcli',
        'wp', 'eval-file', $ContainerScript
    ) + $ScriptArguments
    $PreviousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $Output = & docker @DockerArguments 2>&1
        $ExitCode = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $PreviousErrorActionPreference }
    if (-not $SuppressOutput) {
        foreach ($Line in $Output) { Write-Host $Line }
    }
    if ($ExitCode -ne 0) {
        if ($SuppressOutput) {
            foreach ($Line in $Output) { [Console]::Error.WriteLine($Line) }
        }
        throw "Local WordPress CLI operation failed with exit code $ExitCode."
    }
    return ($Output -join "`n")
}

foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ExportScriptPath, $RetireScriptPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) {
        throw "Missing required local root-only migration file: $RequiredFile"
    }
}

if ([string]::IsNullOrWhiteSpace($EvidenceDirectory)) {
    $EvidenceDirectory = Join-Path $LocalEvidenceRoot 'root-only-retirement'
}
$EvidenceDirectory = Resolve-SafeLocalPath -Path $EvidenceDirectory -AllowedRoot $LocalEvidenceRoot
[System.IO.Directory]::CreateDirectory($EvidenceDirectory) | Out-Null

if ([string]::IsNullOrWhiteSpace($SnapshotPath)) {
    $ExportOutput = Invoke-LocalWpEvalFile `
        -ContainerScript '/workspace/wordpress/seed/export-route-status-snapshot.php' `
        -SuppressOutput
    $SnapshotMatch = [regex]::Match(
        $ExportOutput,
        '(?s)TIO2_ROOT_ONLY_SNAPSHOT_BEGIN\s*(.*?)\s*TIO2_ROOT_ONLY_SNAPSHOT_END'
    )
    if (-not $SnapshotMatch.Success) {
        throw 'Snapshot exporter did not return a typed root-only snapshot.'
    }
    $SnapshotObject = $SnapshotMatch.Groups[1].Value | ConvertFrom-Json
    if ([string]$SnapshotObject.schemaVersion -ne 'root-only-retirement-v0.1') {
        throw 'Snapshot exporter returned an unexpected schema version.'
    }
    $Timestamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
    $SnapshotPath = Join-Path $EvidenceDirectory "root-only-route-status-$Timestamp.json"
    $SnapshotPath = Resolve-SafeLocalPath -Path $SnapshotPath -AllowedRoot $EvidenceDirectory
    [System.IO.File]::WriteAllText(
        $SnapshotPath,
        ($SnapshotObject | ConvertTo-Json -Depth 12 -Compress),
        [System.Text.UTF8Encoding]::new($false)
    )
}
else {
    $SnapshotPath = Resolve-SafeLocalPath -Path $SnapshotPath -AllowedRoot $EvidenceDirectory -MustExist
}

$ContainerSnapshotPath = ConvertTo-ContainerPath -LocalPath $SnapshotPath
$OperationArguments = @($ContainerSnapshotPath)
if ($DryRun) { $OperationArguments += 'dry-run' }
if ($FailureAfter -gt 0) { $OperationArguments += "failure-after=$FailureAfter" }
$RetireOutput = Invoke-LocalWpEvalFile `
    -ContainerScript '/workspace/wordpress/seed/retire-public-routes.php' `
    -ScriptArguments $OperationArguments `
    -SuppressOutput
$ResultMatches = [regex]::Matches($RetireOutput, 'TIO2_ROOT_ONLY_RESULT\s+(\{[^\r\n]+\})')
if ($ResultMatches.Count -ne 1) {
    throw 'Retirement operation did not return exactly one machine result.'
}
$Result = $ResultMatches[0].Groups[1].Value | ConvertFrom-Json
$Result | Add-Member -NotePropertyName snapshotPath -NotePropertyValue $SnapshotPath -Force
Write-Output "TIO2_ROOT_ONLY_RESULT $($Result | ConvertTo-Json -Depth 10 -Compress)"
