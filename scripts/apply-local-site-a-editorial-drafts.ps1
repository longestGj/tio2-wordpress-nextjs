[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Plan', 'Apply')]
    [string] $Mode,
    [Parameter(Mandatory = $true)]
    [ValidateSet('Strict', 'DeferredProductRelations')]
    [string] $RelationshipMode,
    [Parameter(Mandatory = $true)]
    [string] $ApplicationsManifestPath,
    [Parameter(Mandatory = $true)]
    [string] $ResourcesManifestPath,
    [Parameter(Mandatory = $true)]
    [string] $ProductsManifestPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$SeedDirectory = Join-Path $WordPressDirectory 'seed'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ImporterPath = Join-Path $SeedDirectory 'apply-site-a-editorial-drafts.php'
. (Join-Path $PSScriptRoot 'editorial/local-editorial-runtime.ps1')
foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ImporterPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) { throw "Missing required local editorial import file: $RequiredFile" }
}
& (Join-Path $PSScriptRoot 'assert-local-wordpress-env.ps1') -EnvironmentPath $EnvironmentFile | Out-Null

$ApplicationsManifestPath = Resolve-LocalEditorialManifestPath -Path $ApplicationsManifestPath -Name 'ApplicationsManifestPath'
$ResourcesManifestPath = Resolve-LocalEditorialManifestPath -Path $ResourcesManifestPath -Name 'ResourcesManifestPath'
$ProductsManifestPath = Resolve-LocalEditorialManifestPath -Path $ProductsManifestPath -Name 'ProductsManifestPath'

$EnvironmentValues = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentFile) {
    if ($Line -match '^([^#=]+)=(.*)$') { $EnvironmentValues[$Matches[1].Trim()] = $Matches[2].Trim() }
}
$AdminUser = [string] ($EnvironmentValues['WORDPRESS_ADMIN_USER'] ?? '')
if ([string]::IsNullOrWhiteSpace($AdminUser)) { throw 'The local WordPress environment does not declare WORDPRESS_ADMIN_USER.' }

function New-EditorialCapabilityToken {
    $TokenBytes = New-Object byte[] 32
    $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $Generator.GetBytes($TokenBytes) } finally { $Generator.Dispose() }
    return -join ($TokenBytes | ForEach-Object { $_.ToString('x2') })
}

function New-LocalEditorialDraftCapability {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('plan', 'apply')][string] $CapabilityMode,
        [AllowNull()][object] $PlanSha256
    )
    return [ordered]@{
        version = 1
        token = New-EditorialCapabilityToken
        mode = $CapabilityMode
        relationshipMode = $RelationshipMode
        applicationsPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeApplicationsPath)
        applicationsSha256 = $ApplicationsSha256
        resourcesPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeResourcesPath)
        resourcesSha256 = $ResourcesSha256
        productsPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeProductsPath)
        productsSha256 = $ProductsSha256
        planSha256 = $PlanSha256
    }
}

function Invoke-LocalEditorialDraftImport {
    param([Parameter(Mandatory = $true)][hashtable] $Capability)
    $CapabilityPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-draft-capability-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
    $TemporaryPaths.Add($CapabilityPath)
    try {
        [System.IO.File]::WriteAllText($CapabilityPath, ($Capability | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
        $DockerArguments = @(
            'compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile,
            'run', '--rm', '--no-TTY', '--user', '33:33',
            '-e', 'TIO2_LOCAL_EDITORIAL_DRAFT_CAPABILITY',
            'wpcli', 'wp', "--user=$AdminUser", 'eval-file',
            '/workspace/wordpress/seed/apply-site-a-editorial-drafts.php',
            ('/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($CapabilityPath))
        )
        $CapabilityEnvironmentName = 'TIO2_LOCAL_EDITORIAL_DRAFT_CAPABILITY'
        $PreviousCapabilityEnvironment = [System.Environment]::GetEnvironmentVariable($CapabilityEnvironmentName, [System.EnvironmentVariableTarget]::Process)
        try {
            [System.Environment]::SetEnvironmentVariable($CapabilityEnvironmentName, [string] $Capability.token, [System.EnvironmentVariableTarget]::Process)
            $PreviousErrorActionPreference = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            try { $CommandOutput = & docker @DockerArguments 2>&1; $CommandExitCode = $LASTEXITCODE } finally { $ErrorActionPreference = $PreviousErrorActionPreference }
        }
        finally {
            [System.Environment]::SetEnvironmentVariable($CapabilityEnvironmentName, $PreviousCapabilityEnvironment, [System.EnvironmentVariableTarget]::Process)
        }
        foreach ($OutputLine in $CommandOutput) { Write-Host $OutputLine }
        if ($CommandExitCode -ne 0) { throw "Local Site A editorial draft $($Capability.mode) failed with exit code $CommandExitCode." }
        $Marker = 'TIO2_SITE_A_EDITORIAL_DRAFT_RESULT '
        $ResultLines = @($CommandOutput | ForEach-Object { [string] $_ } | Where-Object { $_.Contains($Marker) })
        if (1 -ne $ResultLines.Count) { throw 'Local Site A editorial draft command did not return exactly one deterministic result.' }
        return ($ResultLines[0].Substring($ResultLines[0].IndexOf($Marker) + $Marker.Length) | ConvertFrom-Json)
    }
    finally {
        try {
            if (Test-Path -LiteralPath $CapabilityPath) { [System.IO.File]::Delete($CapabilityPath) }
            if (-not (Test-Path -LiteralPath $CapabilityPath)) { $null = $TemporaryPaths.Remove($CapabilityPath) }
        }
        catch {
            Write-Verbose "Capability cleanup will be retried by outer runtime ownership: $CapabilityPath"
        }
    }
}

$RuntimeApplicationsPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-applications-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$RuntimeResourcesPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-resources-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$RuntimeProductsPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-products-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$TemporaryPaths = [System.Collections.Generic.List[string]]::new()
foreach ($RuntimePath in @($RuntimeApplicationsPath, $RuntimeResourcesPath, $RuntimeProductsPath)) { $TemporaryPaths.Add($RuntimePath) }
$ApplicationsSourceHashBefore = $null
$ResourcesSourceHashBefore = $null
$ProductsSourceHashBefore = $null
$OperationError = $null
$FinalizationError = $null
try {
    $ApplicationsSourceHashBefore = (Get-FileHash -LiteralPath $ApplicationsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ResourcesSourceHashBefore = (Get-FileHash -LiteralPath $ResourcesManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSourceHashBefore = (Get-FileHash -LiteralPath $ProductsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::Copy($ApplicationsManifestPath, $RuntimeApplicationsPath, $false)
    [System.IO.File]::Copy($ResourcesManifestPath, $RuntimeResourcesPath, $false)
    [System.IO.File]::Copy($ProductsManifestPath, $RuntimeProductsPath, $false)
    $ApplicationsSourceHashAfter = (Get-FileHash -LiteralPath $ApplicationsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ResourcesSourceHashAfter = (Get-FileHash -LiteralPath $ResourcesManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSourceHashAfter = (Get-FileHash -LiteralPath $ProductsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ApplicationsSha256 = (Get-FileHash -LiteralPath $RuntimeApplicationsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ResourcesSha256 = (Get-FileHash -LiteralPath $RuntimeResourcesPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSha256 = (Get-FileHash -LiteralPath $RuntimeProductsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($ApplicationsSourceHashBefore -cne $ApplicationsSourceHashAfter -or $ApplicationsSha256 -cne $ApplicationsSourceHashBefore -or $ResourcesSourceHashBefore -cne $ResourcesSourceHashAfter -or $ResourcesSha256 -cne $ResourcesSourceHashBefore -or $ProductsSourceHashBefore -cne $ProductsSourceHashAfter -or $ProductsSha256 -cne $ProductsSourceHashBefore) {
        throw 'An editorial manifest changed while its staged runtime snapshot was created.'
    }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-applications.mjs') $RuntimeApplicationsPath
    if ($LASTEXITCODE -ne 0) { throw 'The staged Application manifest failed strict validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-resources.mjs') $RuntimeResourcesPath
    if ($LASTEXITCODE -ne 0) { throw 'The staged Resource manifest failed strict validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/products/validate-product-manifest.mjs') $RuntimeProductsPath
    if ($LASTEXITCODE -ne 0) { throw 'The staged Product manifest failed strict validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-content-graph.mjs') --applications $RuntimeApplicationsPath --resources $RuntimeResourcesPath --products $RuntimeProductsPath
    if ($LASTEXITCODE -ne 0) { throw 'The staged editorial content graph failed validation.' }

    $PlanCapability = New-LocalEditorialDraftCapability -CapabilityMode 'plan' -PlanSha256 $null
    $PlanResult = Invoke-LocalEditorialDraftImport -Capability $PlanCapability
    if ($Mode -eq 'Apply') {
        if ([string]::IsNullOrWhiteSpace([string] $PlanResult.planSha256) -or [string] $PlanResult.planSha256 -notmatch '^[a-f0-9]{64}$') { throw 'The fresh Plan did not return a valid deterministic Plan result hash.' }
        $ApplyCapability = New-LocalEditorialDraftCapability -CapabilityMode 'apply' -PlanSha256 ([string] $PlanResult.planSha256)
        $null = Invoke-LocalEditorialDraftImport -Capability $ApplyCapability
    }
}
catch {
    $OperationError = $_.Exception
}
finally {
    try {
        Complete-LocalEditorialRuntime -TemporaryPaths $TemporaryPaths.ToArray() -SourceChecks @(
            [pscustomobject]@{ Label = 'Application'; Path = $ApplicationsManifestPath; ExpectedHash = $ApplicationsSourceHashBefore },
            [pscustomobject]@{ Label = 'Resource'; Path = $ResourcesManifestPath; ExpectedHash = $ResourcesSourceHashBefore },
            [pscustomobject]@{ Label = 'Product'; Path = $ProductsManifestPath; ExpectedHash = $ProductsSourceHashBefore }
        )
    }
    catch { $FinalizationError = $_.Exception }
}
if ($null -ne $OperationError -and $null -ne $FinalizationError) { throw [System.AggregateException]::new('The local editorial operation and finalization both failed.', @($OperationError, $FinalizationError)) }
if ($null -ne $OperationError) { throw $OperationError }
if ($null -ne $FinalizationError) { throw $FinalizationError }
