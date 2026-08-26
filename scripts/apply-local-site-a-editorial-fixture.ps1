[CmdletBinding()]
param(
    [switch] $PlanOnly,
    [switch] $Apply,
    [ValidateSet('', 'after-fields')]
    [string] $FailurePoint = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ($PlanOnly -eq $Apply) {
    throw 'Choose exactly one mode: -PlanOnly or -Apply.'
}
if ($PlanOnly -and -not [string]::IsNullOrEmpty($FailurePoint)) {
    throw 'FailurePoint is available only with -Apply.'
}

$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ManifestPath = Join-Path $WordPressDirectory 'seed/representative-content.json'
$ApplyScriptPath = Join-Path $WordPressDirectory 'seed/apply-site-a-editorial-fixture.php'

foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ManifestPath, $ApplyScriptPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile)) {
        throw "Missing required local WordPress file: $RequiredFile"
    }
}

$Mode = if ($Apply) { 'apply' } else { 'plan' }
$DockerArguments = @(
    'compose',
    '--env-file', $EnvironmentFile,
    '-f', $ComposeFile,
    'run', '--rm', '--no-TTY', '--user', '33:33',
    '-e', 'TIO2_LOCAL_EDITORIAL_FIXTURE=1',
    'wpcli',
    'wp', 'eval-file', '/workspace/wordpress/seed/apply-site-a-editorial-fixture.php',
    '/workspace/wordpress/seed/representative-content.json',
    $Mode,
    $FailurePoint
)

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $CommandOutput = & docker @DockerArguments 2>&1
    $CommandExitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $PreviousErrorActionPreference
}

foreach ($OutputLine in $CommandOutput) {
    Write-Host $OutputLine
}
if ($CommandExitCode -ne 0) {
    throw "Local Site A editorial fixture command failed with exit code $CommandExitCode."
}
