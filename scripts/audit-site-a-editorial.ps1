[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Strict', 'DeferredProductRelations')]
    [string] $RelationshipMode,
    [Parameter(Mandatory = $true)][string] $ApplicationsManifestPath,
    [Parameter(Mandatory = $true)][string] $ResourcesManifestPath,
    [Parameter(Mandatory = $true)][string] $ProductsManifestPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$SeedDirectory = Join-Path $WordPressDirectory 'seed'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ExporterPath = Join-Path $SeedDirectory 'export-site-a-editorial-audit.php'
foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ExporterPath)) { if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) { throw "Missing required local editorial audit file: $RequiredFile" } }
& (Join-Path $PSScriptRoot 'assert-local-wordpress-env.ps1') -EnvironmentPath $EnvironmentFile | Out-Null
foreach ($InputValue in @($ApplicationsManifestPath, $ResourcesManifestPath, $ProductsManifestPath)) { if ([string]::IsNullOrWhiteSpace($InputValue) -or $InputValue.IndexOfAny([char[]]'*?') -ge 0 -or $InputValue -match '^[A-Za-z][A-Za-z0-9+.-]*://') { throw 'Each audit manifest path must be one local literal file without wildcard or URI syntax.' } }
$ApplicationsManifestPath = [System.IO.Path]::GetFullPath($ApplicationsManifestPath)
$ResourcesManifestPath = [System.IO.Path]::GetFullPath($ResourcesManifestPath)
$ProductsManifestPath = [System.IO.Path]::GetFullPath($ProductsManifestPath)
if (-not (Test-Path -LiteralPath $ApplicationsManifestPath -PathType Leaf)) { throw 'ApplicationsManifestPath must resolve to one local leaf file.' }
if (-not (Test-Path -LiteralPath $ResourcesManifestPath -PathType Leaf)) { throw 'ResourcesManifestPath must resolve to one local leaf file.' }
if (-not (Test-Path -LiteralPath $ProductsManifestPath -PathType Leaf)) { throw 'ProductsManifestPath must resolve to one local leaf file.' }
$EnvironmentValues = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentFile) { if ($Line -match '^([^#=]+)=(.*)$') { $EnvironmentValues[$Matches[1].Trim()] = $Matches[2].Trim() } }
$AdminUser = [string] ($EnvironmentValues['WORDPRESS_ADMIN_USER'] ?? '')
if ([string]::IsNullOrWhiteSpace($AdminUser)) { throw 'The local WordPress environment does not declare WORDPRESS_ADMIN_USER.' }

$RuntimeApplicationsPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-audit-applications-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$RuntimeResourcesPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-audit-resources-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$RuntimeProductsPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-audit-products-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$CapabilityPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-audit-capability-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$TemporaryPaths = @($CapabilityPath, $RuntimeApplicationsPath, $RuntimeResourcesPath, $RuntimeProductsPath)
$ApplicationsSourceHashBefore = $null; $ResourcesSourceHashBefore = $null; $ProductsSourceHashBefore = $null
try {
    $ApplicationsSourceHashBefore = (Get-FileHash -LiteralPath $ApplicationsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ResourcesSourceHashBefore = (Get-FileHash -LiteralPath $ResourcesManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSourceHashBefore = (Get-FileHash -LiteralPath $ProductsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::Copy($ApplicationsManifestPath, $RuntimeApplicationsPath, $false); [System.IO.File]::Copy($ResourcesManifestPath, $RuntimeResourcesPath, $false); [System.IO.File]::Copy($ProductsManifestPath, $RuntimeProductsPath, $false)
    $ApplicationsSourceHashAfter = (Get-FileHash -LiteralPath $ApplicationsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ResourcesSourceHashAfter = (Get-FileHash -LiteralPath $ResourcesManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSourceHashAfter = (Get-FileHash -LiteralPath $ProductsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ApplicationsSha256 = (Get-FileHash -LiteralPath $RuntimeApplicationsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ResourcesSha256 = (Get-FileHash -LiteralPath $RuntimeResourcesPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSha256 = (Get-FileHash -LiteralPath $RuntimeProductsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($ApplicationsSourceHashBefore -cne $ApplicationsSourceHashAfter -or $ApplicationsSha256 -cne $ApplicationsSourceHashBefore -or $ResourcesSourceHashBefore -cne $ResourcesSourceHashAfter -or $ResourcesSha256 -cne $ResourcesSourceHashBefore -or $ProductsSourceHashBefore -cne $ProductsSourceHashAfter -or $ProductsSha256 -cne $ProductsSourceHashBefore) { throw 'An editorial manifest changed while its audit snapshot was staged.' }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-applications.mjs') $RuntimeApplicationsPath; if ($LASTEXITCODE -ne 0) { throw 'The staged Application audit manifest failed validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-resources.mjs') $RuntimeResourcesPath; if ($LASTEXITCODE -ne 0) { throw 'The staged Resource audit manifest failed validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/products/validate-product-manifest.mjs') $RuntimeProductsPath; if ($LASTEXITCODE -ne 0) { throw 'The staged Product audit manifest failed validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-content-graph.mjs') --applications $RuntimeApplicationsPath --resources $RuntimeResourcesPath --products $RuntimeProductsPath; if ($LASTEXITCODE -ne 0) { throw 'The staged editorial audit graph failed validation.' }
    $TokenBytes = New-Object byte[] 32
    $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $Generator.GetBytes($TokenBytes) } finally { $Generator.Dispose() }
    $Token = -join ($TokenBytes | ForEach-Object { $_.ToString('x2') })
    $Capability = [ordered]@{ version = 1; token = $Token; relationshipMode = $RelationshipMode; applicationsPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeApplicationsPath); applicationsSha256 = $ApplicationsSha256; resourcesPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeResourcesPath); resourcesSha256 = $ResourcesSha256; productsPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeProductsPath); productsSha256 = $ProductsSha256 }
    [System.IO.File]::WriteAllText($CapabilityPath, ($Capability | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
    $DockerArguments = @('compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile, 'run', '--rm', '--no-TTY', '--user', '33:33', '-e', "TIO2_LOCAL_EDITORIAL_AUDIT_CAPABILITY=$Token", 'wpcli', 'wp', "--user=$AdminUser", 'eval-file', '/workspace/wordpress/seed/export-site-a-editorial-audit.php', ('/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($CapabilityPath)))
    $PreviousErrorActionPreference = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try { $CommandOutput = & docker @DockerArguments 2>&1; $CommandExitCode = $LASTEXITCODE } finally { $ErrorActionPreference = $PreviousErrorActionPreference }
    foreach ($OutputLine in $CommandOutput) { Write-Host $OutputLine }
    if ($CommandExitCode -ne 0) { throw "Local Site A editorial audit failed with exit code $CommandExitCode." }
}
finally {
    foreach ($TemporaryPath in $TemporaryPaths) { if (Test-Path -LiteralPath $TemporaryPath) { [System.IO.File]::Delete($TemporaryPath) } }
    if ($null -ne $ApplicationsSourceHashBefore -and (Get-FileHash -LiteralPath $ApplicationsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ApplicationsSourceHashBefore) { throw 'The Application source manifest changed during audit.' }
    if ($null -ne $ResourcesSourceHashBefore -and (Get-FileHash -LiteralPath $ResourcesManifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ResourcesSourceHashBefore) { throw 'The Resource source manifest changed during audit.' }
    if ($null -ne $ProductsSourceHashBefore -and (Get-FileHash -LiteralPath $ProductsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ProductsSourceHashBefore) { throw 'The Product source manifest changed during audit.' }
}
