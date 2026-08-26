[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $ManifestPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ExporterPath = Join-Path $WordPressDirectory 'seed/export-site-a-product-audit.php'
$SeedDirectory = Join-Path $WordPressDirectory 'seed'

foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ExporterPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) {
        throw "Missing required local Product audit file: $RequiredFile"
    }
}
& (Join-Path $PSScriptRoot 'assert-local-wordpress-env.ps1') -EnvironmentPath $EnvironmentFile | Out-Null

if ([string]::IsNullOrWhiteSpace($ManifestPath) -or $ManifestPath.IndexOfAny([char[]]'*?') -ge 0 -or $ManifestPath -match '^[A-Za-z][A-Za-z0-9+.-]*://') {
    throw 'ManifestPath must be one local literal file path without wildcard or URI syntax.'
}
$ManifestPath = [System.IO.Path]::GetFullPath($ManifestPath)
if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
    throw 'ManifestPath must resolve to one existing local file.'
}

$EnvironmentValues = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentFile) {
    if ($Line -match '^([^#=]+)=(.*)$') { $EnvironmentValues[$Matches[1].Trim()] = $Matches[2].Trim() }
}
$AdminUser = [string] ($EnvironmentValues['WORDPRESS_ADMIN_USER'] ?? '')
if ([string]::IsNullOrWhiteSpace($AdminUser)) { throw 'The local WordPress environment does not declare WORDPRESS_ADMIN_USER.' }

$RuntimeManifestPath = Join-Path $SeedDirectory ('.runtime-site-a-product-audit-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$CapabilityPath = Join-Path $SeedDirectory ('.runtime-site-a-product-audit-capability-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
try {
    $SourceHashBefore = (Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::Copy($ManifestPath, $RuntimeManifestPath, $false)
    $SourceHashAfter = (Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $RuntimeHash = (Get-FileHash -LiteralPath $RuntimeManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($SourceHashBefore -cne $SourceHashAfter -or $RuntimeHash -cne $SourceHashBefore) { throw 'The external Product manifest changed while its audit snapshot was being created.' }
    & node (Join-Path $RepositoryRoot 'scripts/products/validate-product-manifest.mjs') $RuntimeManifestPath
    if ($LASTEXITCODE -ne 0) { throw 'The staged Product audit manifest did not satisfy the approved content contract.' }

    $TokenBytes = New-Object byte[] 32
    $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $Generator.GetBytes($TokenBytes) } finally { $Generator.Dispose() }
    $Token = -join ($TokenBytes | ForEach-Object { $_.ToString('x2') })
    $Capability = [ordered]@{ version = 1; token = $Token; manifestPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeManifestPath); manifestSha256 = $RuntimeHash }
    [System.IO.File]::WriteAllText($CapabilityPath, ($Capability | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))

    $DockerArguments = @('compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile, 'run', '--rm', '--no-TTY', '--user', '33:33', '-e', "TIO2_LOCAL_PRODUCT_AUDIT_CAPABILITY=$Token", 'wpcli', 'wp', "--user=$AdminUser", 'eval-file', '/workspace/wordpress/seed/export-site-a-product-audit.php', '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($CapabilityPath))
    $PreviousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $CommandOutput = & docker @DockerArguments 2>&1; $CommandExitCode = $LASTEXITCODE } finally { $ErrorActionPreference = $PreviousErrorActionPreference }
    foreach ($OutputLine in $CommandOutput) { Write-Host $OutputLine }
    if ($CommandExitCode -ne 0) { throw "Local Site A Product draft audit failed with exit code $CommandExitCode." }
    $SourceHashFinal = (Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($SourceHashBefore -cne $SourceHashFinal) { throw 'The external Product manifest changed during audit.' }
}
finally {
    foreach ($TemporaryPath in @($CapabilityPath, $RuntimeManifestPath)) {
        if (Test-Path -LiteralPath $TemporaryPath) { [System.IO.File]::Delete($TemporaryPath) }
    }
}
