[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][ValidateSet('Plan', 'Apply')][string] $Mode,
    [Parameter(Mandatory = $true)][string] $ApplicationsManifestPath,
    [Parameter(Mandatory = $true)][string] $ProductsManifestPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$SeedDirectory = Join-Path $WordPressDirectory 'seed'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ImporterPath = Join-Path $SeedDirectory 'apply-site-a-application-review-drafts.php'
. (Join-Path $PSScriptRoot 'editorial/local-editorial-runtime.ps1')
foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ImporterPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) { throw "Missing required local Application review file: $RequiredFile" }
}
& (Join-Path $PSScriptRoot 'assert-local-wordpress-env.ps1') -EnvironmentPath $EnvironmentFile | Out-Null
$ApplicationsManifestPath = Resolve-LocalEditorialManifestPath -Path $ApplicationsManifestPath -Name 'ApplicationsManifestPath'
$ProductsManifestPath = Resolve-LocalEditorialManifestPath -Path $ProductsManifestPath -Name 'ProductsManifestPath'

$EnvironmentValues = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentFile) {
    if ($Line -match '^([^#=]+)=(.*)$') { $EnvironmentValues[$Matches[1].Trim()] = $Matches[2].Trim() }
}
$AdminUser = [string] ($EnvironmentValues['WORDPRESS_ADMIN_USER'] ?? '')
if ([string]::IsNullOrWhiteSpace($AdminUser)) { throw 'The local WordPress environment does not declare WORDPRESS_ADMIN_USER.' }

function New-ApplicationReviewToken {
    $Bytes = New-Object byte[] 32
    $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $Generator.GetBytes($Bytes) } finally { $Generator.Dispose() }
    return -join ($Bytes | ForEach-Object { $_.ToString('x2') })
}

function Invoke-ApplicationReviewImport {
    param([Parameter(Mandatory = $true)][string] $CapabilityMode, [AllowNull()][object] $PlanSha256)
    $CapabilityPath = Join-Path $SeedDirectory ('.runtime-site-a-application-review-capability-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
    $TemporaryPaths.Add($CapabilityPath)
    $Token = New-ApplicationReviewToken
    $Capability = [ordered]@{
        version = 1; token = $Token; mode = $CapabilityMode
        applicationsPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeApplicationsPath)
        applicationsSha256 = $ApplicationsSha256
        productsPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeProductsPath)
        productsSha256 = $ProductsSha256; planSha256 = $PlanSha256
    }
    try {
        [System.IO.File]::WriteAllText($CapabilityPath, ($Capability | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
        $DockerArguments = @(
            'compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile,
            'run', '--rm', '--no-TTY', '--user', '33:33',
            '-e', 'TIO2_LOCAL_APPLICATION_REVIEW_CAPABILITY',
            'wpcli', 'wp', "--user=$AdminUser", 'eval-file',
            '/workspace/wordpress/seed/apply-site-a-application-review-drafts.php',
            ('/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($CapabilityPath))
        )
        $Name = 'TIO2_LOCAL_APPLICATION_REVIEW_CAPABILITY'
        $Previous = [System.Environment]::GetEnvironmentVariable($Name, [System.EnvironmentVariableTarget]::Process)
        try {
            [System.Environment]::SetEnvironmentVariable($Name, $Token, [System.EnvironmentVariableTarget]::Process)
            $PreviousPreference = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
            try { $Output = & docker @DockerArguments 2>&1; $ExitCode = $LASTEXITCODE } finally { $ErrorActionPreference = $PreviousPreference }
        } finally {
            [System.Environment]::SetEnvironmentVariable($Name, $Previous, [System.EnvironmentVariableTarget]::Process)
        }
        foreach ($Line in $Output) { Write-Host $Line }
        if (0 -ne $ExitCode) { throw "Local Application review $CapabilityMode failed with exit code $ExitCode." }
        $Marker = 'TIO2_SITE_A_APPLICATION_REVIEW_RESULT '
        $Lines = @($Output | ForEach-Object { [string] $_ } | Where-Object { $_.Contains($Marker) })
        if (1 -ne $Lines.Count) { throw 'Application review command did not return exactly one deterministic result.' }
        return ($Lines[0].Substring($Lines[0].IndexOf($Marker) + $Marker.Length) | ConvertFrom-Json)
    } finally {
        if (Test-Path -LiteralPath $CapabilityPath) { [System.IO.File]::Delete($CapabilityPath) }
        $null = $TemporaryPaths.Remove($CapabilityPath)
    }
}

$RuntimeApplicationsPath = Join-Path $SeedDirectory ('.runtime-site-a-application-review-applications-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$RuntimeProductsPath = Join-Path $SeedDirectory ('.runtime-site-a-application-review-products-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$TemporaryPaths = [System.Collections.Generic.List[string]]::new()
$TemporaryPaths.Add($RuntimeApplicationsPath); $TemporaryPaths.Add($RuntimeProductsPath)
$ApplicationsSourceHash = $null; $ProductsSourceHash = $null
try {
    $ApplicationsSourceHash = (Get-FileHash -LiteralPath $ApplicationsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSourceHash = (Get-FileHash -LiteralPath $ProductsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::Copy($ApplicationsManifestPath, $RuntimeApplicationsPath, $false)
    [System.IO.File]::Copy($ProductsManifestPath, $RuntimeProductsPath, $false)
    $ApplicationsSha256 = (Get-FileHash -LiteralPath $RuntimeApplicationsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSha256 = (Get-FileHash -LiteralPath $RuntimeProductsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($ApplicationsSourceHash -cne $ApplicationsSha256 -or $ProductsSourceHash -cne $ProductsSha256) { throw 'An Application review manifest changed while staging.' }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-applications.mjs') --allow-incomplete $RuntimeApplicationsPath
    if (0 -ne $LASTEXITCODE) { throw 'The three-page Application review manifest failed validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/products/validate-product-manifest.mjs') $RuntimeProductsPath
    if (0 -ne $LASTEXITCODE) { throw 'The Product dependency manifest failed validation.' }
    $Plan = Invoke-ApplicationReviewImport -CapabilityMode 'plan' -PlanSha256 $null
    $Changed = @($Plan.actions | Where-Object { $_.action -ne 'no-change' })
    $Allowed = @('applications-hub', 'coatings', 'water-based-paint')
    if ($Plan.actions.Count -ne 3 -or @($Plan.actions | Where-Object { $_.entityType -ne 'application' -or $_.id -notin $Allowed -or $_.action -notin @('create','update','no-change') }).Count -ne 0) {
        throw 'Application review Plan escaped the exact three-page allowlist.'
    }
    if ('Apply' -eq $Mode) {
        $Apply = Invoke-ApplicationReviewImport -CapabilityMode 'apply' -PlanSha256 ([string] $Plan.planSha256)
        if ('apply' -ne [string] $Apply.mode) { throw 'Application review Apply did not return a committed result.' }
    }
} finally {
    Complete-LocalEditorialRuntime -TemporaryPaths $TemporaryPaths.ToArray() -SourceChecks @(
        [pscustomobject]@{ Label = 'Application review'; Path = $ApplicationsManifestPath; ExpectedHash = $ApplicationsSourceHash },
        [pscustomobject]@{ Label = 'Product'; Path = $ProductsManifestPath; ExpectedHash = $ProductsSourceHash }
    )
}
