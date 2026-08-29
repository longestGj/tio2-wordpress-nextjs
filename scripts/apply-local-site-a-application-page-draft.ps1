[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][ValidateSet('Plan', 'Apply')][string] $Mode,
    [Parameter(Mandatory = $true)][string] $ApplicationPath,
    [Parameter(Mandatory = $true)][string] $ProductsManifestPath,
    [string] $EnvironmentPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$SeedDirectory = Join-Path $WordPressDirectory 'seed'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ImporterPath = Join-Path $SeedDirectory 'apply-site-a-application-page-draft.php'
if ([string]::IsNullOrWhiteSpace($EnvironmentPath)) {
    $EnvironmentPath = Join-Path $WordPressDirectory '.env'
}
$EnvironmentPath = (Resolve-Path -LiteralPath $EnvironmentPath).Path
$ApplicationPath = (Resolve-Path -LiteralPath $ApplicationPath).Path
$ProductsManifestPath = (Resolve-Path -LiteralPath $ProductsManifestPath).Path
foreach ($RequiredFile in @($EnvironmentPath, $ComposeFile, $ImporterPath, $ApplicationPath, $ProductsManifestPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) {
        throw "Missing required single Application import file: $RequiredFile"
    }
}
& (Join-Path $PSScriptRoot 'assert-local-wordpress-env.ps1') -EnvironmentPath $EnvironmentPath | Out-Null

$EnvironmentValues = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentPath) {
    if ($Line -match '^([^#=]+)=(.*)$') { $EnvironmentValues[$Matches[1].Trim()] = $Matches[2].Trim() }
}
$AdminUser = [string] ($EnvironmentValues['WORDPRESS_ADMIN_USER'] ?? '')
if ([string]::IsNullOrWhiteSpace($AdminUser)) {
    throw 'The local WordPress environment does not declare WORDPRESS_ADMIN_USER.'
}

function New-ApplicationPageToken {
    $Bytes = New-Object byte[] 32
    $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $Generator.GetBytes($Bytes) } finally { $Generator.Dispose() }
    return -join ($Bytes | ForEach-Object { $_.ToString('x2') })
}

$RuntimeApplicationPath = Join-Path $SeedDirectory ('.runtime-site-a-application-page-application-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$RuntimeProductsPath = Join-Path $SeedDirectory ('.runtime-site-a-application-page-products-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$ValidationManifestPath = Join-Path $SeedDirectory ('.runtime-site-a-application-page-validation-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$TemporaryPaths = @($RuntimeApplicationPath, $RuntimeProductsPath, $ValidationManifestPath)

function Invoke-ApplicationPageImport {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('plan', 'apply')][string] $CapabilityMode,
        [AllowNull()][object] $PlanSha256
    )
    $CapabilityPath = Join-Path $SeedDirectory ('.runtime-site-a-application-page-capability-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
    $Token = New-ApplicationPageToken
    $Capability = [ordered]@{
        version = 1
        token = $Token
        mode = $CapabilityMode
        applicationPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeApplicationPath)
        applicationSha256 = $ApplicationSha256
        productsPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeProductsPath)
        productsSha256 = $ProductsSha256
        planSha256 = $PlanSha256
    }
    try {
        [System.IO.File]::WriteAllText($CapabilityPath, ($Capability | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
        $Arguments = @(
            'compose', '--env-file', $EnvironmentPath, '-f', $ComposeFile,
            'run', '--rm', '--no-TTY', '--user', '33:33',
            '-e', 'TIO2_LOCAL_APPLICATION_PAGE_CAPABILITY',
            'wpcli', 'wp', "--user=$AdminUser", 'eval-file',
            '/workspace/wordpress/seed/apply-site-a-application-page-draft.php',
            ('/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($CapabilityPath))
        )
        $Name = 'TIO2_LOCAL_APPLICATION_PAGE_CAPABILITY'
        $Previous = [System.Environment]::GetEnvironmentVariable($Name, [System.EnvironmentVariableTarget]::Process)
        try {
            [System.Environment]::SetEnvironmentVariable($Name, $Token, [System.EnvironmentVariableTarget]::Process)
            $PreviousPreference = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            try { $Output = & docker @Arguments 2>&1; $ExitCode = $LASTEXITCODE } finally { $ErrorActionPreference = $PreviousPreference }
        } finally {
            [System.Environment]::SetEnvironmentVariable($Name, $Previous, [System.EnvironmentVariableTarget]::Process)
        }
        foreach ($OutputLine in $Output) { Write-Host $OutputLine }
        if (0 -ne $ExitCode) { throw "Single Application page $CapabilityMode failed with exit code $ExitCode." }
        $Marker = 'TIO2_SITE_A_APPLICATION_PAGE_RESULT '
        $ResultLines = @($Output | ForEach-Object { [string] $_ } | Where-Object { $_.Contains($Marker) })
        if (1 -ne $ResultLines.Count) { throw 'Single Application page command did not return exactly one deterministic result.' }
        return ($ResultLines[0].Substring($ResultLines[0].IndexOf($Marker) + $Marker.Length) | ConvertFrom-Json)
    } finally {
        if (Test-Path -LiteralPath $CapabilityPath) { [System.IO.File]::Delete($CapabilityPath) }
    }
}

try {
    $ApplicationSourceHash = (Get-FileHash -LiteralPath $ApplicationPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSourceHash = (Get-FileHash -LiteralPath $ProductsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::Copy($ApplicationPath, $RuntimeApplicationPath, $false)
    [System.IO.File]::Copy($ProductsManifestPath, $RuntimeProductsPath, $false)
    $ApplicationSha256 = (Get-FileHash -LiteralPath $RuntimeApplicationPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSha256 = (Get-FileHash -LiteralPath $RuntimeProductsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($ApplicationSourceHash -cne $ApplicationSha256 -or $ProductsSourceHash -cne $ProductsSha256) {
        throw 'A single Application import source changed while staging.'
    }
    $Page = Get-Content -LiteralPath $RuntimeApplicationPath -Raw | ConvertFrom-Json -AsHashtable
    $ValidationManifest = [ordered]@{version = '0.1'; siteId = 'tio2-a'; records = @($Page)}
    [System.IO.File]::WriteAllText($ValidationManifestPath, ($ValidationManifest | ConvertTo-Json -Depth 100), [System.Text.UTF8Encoding]::new($false))
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-applications.mjs') --allow-incomplete $ValidationManifestPath
    if (0 -ne $LASTEXITCODE) { throw 'The staged single Application page failed validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/products/validate-product-manifest.mjs') $RuntimeProductsPath
    if (0 -ne $LASTEXITCODE) { throw 'The staged Product dependency manifest failed validation.' }

    $Plan = Invoke-ApplicationPageImport -CapabilityMode 'plan' -PlanSha256 $null
    $PlanEscapedPage = $Plan.actions.Count -ne 1 -or
        [string] $Plan.actions[0].entityType -ne 'application' -or
        [string] $Plan.actions[0].id -ne [string] $Page.identity.id -or
        [string] $Plan.actions[0].action -notin @('create', 'update', 'no-change')
    if ($PlanEscapedPage) {
        throw 'The single Application Plan escaped its exact page allowlist.'
    }
    if ('Apply' -eq $Mode) {
        $Applied = Invoke-ApplicationPageImport -CapabilityMode 'apply' -PlanSha256 ([string] $Plan.planSha256)
        if ('apply' -ne [string] $Applied.mode) { throw 'The single Application Apply did not commit.' }
    }
} finally {
    foreach ($TemporaryPath in $TemporaryPaths) {
        if (Test-Path -LiteralPath $TemporaryPath) { [System.IO.File]::Delete($TemporaryPath) }
    }
}
