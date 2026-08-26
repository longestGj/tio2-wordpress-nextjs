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
$CoreScriptPath = Join-Path $WordPressDirectory 'seed/site-a-editorial-fixture-core.php'
$ExpectedManifestSha256 = '85BB4EBB9CB2F593D92131E89FB7FE01D98FBE74E3683E4BAC08CE60D7B57360'

foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ManifestPath, $ApplyScriptPath, $CoreScriptPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile)) {
        throw "Missing required local WordPress file: $RequiredFile"
    }
}

$ManifestStream = [System.IO.File]::OpenRead($ManifestPath)
$Sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
    $ActualManifestSha256 = -join ($Sha256.ComputeHash($ManifestStream) | ForEach-Object { $_.ToString('X2') })
}
finally {
    $Sha256.Dispose()
    $ManifestStream.Dispose()
}
if ($ActualManifestSha256 -cne $ExpectedManifestSha256) {
    throw 'The committed Site A editorial manifest hash does not match the updater contract.'
}

$Mode = if ($Apply) { 'apply' } else { 'plan' }
$CapabilityBytes = New-Object byte[] 32
$RandomNumberGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $RandomNumberGenerator.GetBytes($CapabilityBytes)
}
finally {
    $RandomNumberGenerator.Dispose()
}
$CapabilityToken = -join ($CapabilityBytes | ForEach-Object { $_.ToString('x2') })
$CapabilityName = '.runtime-site-a-editorial-capability-{0}.json' -f ([Guid]::NewGuid().ToString('N'))
$CapabilityPath = Join-Path (Join-Path $WordPressDirectory 'seed') $CapabilityName
$ContainerCapabilityPath = '/workspace/wordpress/seed/' + $CapabilityName
$Capability = [ordered]@{
    version = 1
    token = $CapabilityToken
    mode = $Mode
    failurePoint = $FailurePoint
    manifestSha256 = $ExpectedManifestSha256.ToLowerInvariant()
}
[System.IO.File]::WriteAllText(
    $CapabilityPath,
    ($Capability | ConvertTo-Json -Compress),
    [System.Text.UTF8Encoding]::new($false)
)

$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $DockerArguments = @(
        'compose',
        '--env-file', $EnvironmentFile,
        '-f', $ComposeFile,
        'run', '--rm', '--no-TTY', '--user', '33:33',
        '-e', "TIO2_LOCAL_EDITORIAL_CAPABILITY=$CapabilityToken",
        'wpcli',
        'wp', 'eval-file', '/workspace/wordpress/seed/apply-site-a-editorial-fixture.php',
        $ContainerCapabilityPath
    )
    $CommandOutput = & docker @DockerArguments 2>&1
    $CommandExitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $PreviousErrorActionPreference
    if (Test-Path -LiteralPath $CapabilityPath) {
        [System.IO.File]::Delete($CapabilityPath)
    }
}

foreach ($OutputLine in $CommandOutput) {
    Write-Host $OutputLine
}
if ($CommandExitCode -ne 0) {
    throw "Local Site A editorial fixture command failed with exit code $CommandExitCode."
}
