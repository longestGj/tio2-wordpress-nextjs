[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Plan', 'Apply')]
    [string] $Mode,
    [Parameter(Mandatory = $true)]
    [string] $ManifestPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ImporterPath = Join-Path $WordPressDirectory 'seed/apply-site-a-product-drafts.php'
$SeedDirectory = Join-Path $WordPressDirectory 'seed'

foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ImporterPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) {
        throw "Missing required local WordPress file: $RequiredFile"
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
$ManifestAttributes = [System.IO.File]::GetAttributes($ManifestPath)
if (($ManifestAttributes -band [System.IO.FileAttributes]::Directory) -ne 0) {
    throw 'ManifestPath must not be a directory.'
}

$EnvironmentValues = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentFile) {
    if ($Line -match '^([^#=]+)=(.*)$') {
        $EnvironmentValues[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}
$AdminUser = [string] ($EnvironmentValues['WORDPRESS_ADMIN_USER'] ?? '')
if ([string]::IsNullOrWhiteSpace($AdminUser)) {
    throw 'The local WordPress environment does not declare WORDPRESS_ADMIN_USER.'
}

function New-LocalProductDraftCapability {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('plan', 'apply')]
        [string] $CapabilityMode,
        [Parameter(Mandatory = $true)]
        [string] $RuntimeManifestPath,
        [Parameter(Mandatory = $true)]
        [string] $ManifestHash
    )

    $TokenBytes = New-Object byte[] 32
    $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $Generator.GetBytes($TokenBytes)
    }
    finally {
        $Generator.Dispose()
    }
    return [ordered]@{
        version = 1
        token = -join ($TokenBytes | ForEach-Object { $_.ToString('x2') })
        mode = $CapabilityMode
        manifestPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeManifestPath)
        manifestSha256 = $ManifestHash
        planSha256 = $ManifestHash
    }
}

function Invoke-LocalProductDraftImport {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable] $Capability
    )

    $CapabilityName = '.runtime-site-a-product-drafts-capability-{0}.json' -f ([Guid]::NewGuid().ToString('N'))
    $CapabilityPath = Join-Path $SeedDirectory $CapabilityName
    try {
        [System.IO.File]::WriteAllText(
            $CapabilityPath,
            ($Capability | ConvertTo-Json -Compress),
            [System.Text.UTF8Encoding]::new($false)
        )
        $DockerArguments = @(
            'compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile,
            'run', '--rm', '--no-TTY', '--user', '33:33',
            '-e', "TIO2_LOCAL_PRODUCT_DRAFT_CAPABILITY=$($Capability.token)",
            'wpcli', 'wp', "--user=$AdminUser", 'eval-file',
            '/workspace/wordpress/seed/apply-site-a-product-drafts.php',
            ('/workspace/wordpress/seed/' + $CapabilityName)
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
            throw "Local Site A Product draft $($Capability.mode) command failed with exit code $CommandExitCode."
        }
    }
    finally {
        if (Test-Path -LiteralPath $CapabilityPath) {
            [System.IO.File]::Delete($CapabilityPath)
        }
    }
}

$RuntimeManifestName = '.runtime-site-a-product-drafts-{0}.json' -f ([Guid]::NewGuid().ToString('N'))
$RuntimeManifestPath = Join-Path $SeedDirectory $RuntimeManifestName
try {
    $SourceHashBefore = (Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::Copy($ManifestPath, $RuntimeManifestPath, $false)
    $SourceHashAfter = (Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $RuntimeHash = (Get-FileHash -LiteralPath $RuntimeManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($SourceHashBefore -cne $SourceHashAfter -or $RuntimeHash -cne $SourceHashBefore) {
        throw 'The external Product manifest changed while its staged snapshot was being created.'
    }
    & node (Join-Path $RepositoryRoot 'scripts/products/validate-product-manifest.mjs') $RuntimeManifestPath
    if ($LASTEXITCODE -ne 0) {
        throw 'The staged Product manifest did not satisfy the approved content contract.'
    }
    $ManifestSha256 = $RuntimeHash

    $PlanCapability = New-LocalProductDraftCapability -CapabilityMode 'plan' -RuntimeManifestPath $RuntimeManifestPath -ManifestHash $ManifestSha256
    if ($Mode -eq 'Plan') {
        Invoke-LocalProductDraftImport -Capability $PlanCapability
    }
    else {
        Invoke-LocalProductDraftImport -Capability $PlanCapability
        $ApplyCapability = New-LocalProductDraftCapability -CapabilityMode 'apply' -RuntimeManifestPath $RuntimeManifestPath -ManifestHash $ManifestSha256
        Invoke-LocalProductDraftImport -Capability $ApplyCapability
    }
}
finally {
    if (Test-Path -LiteralPath $RuntimeManifestPath) {
        [System.IO.File]::Delete($RuntimeManifestPath)
    }
}
