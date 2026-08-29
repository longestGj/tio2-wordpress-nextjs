[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Plan', 'Apply')]
    [string] $Mode,
    [Parameter(Mandatory = $true)]
    [string] $FixturePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$SeedDirectory = Join-Path $WordPressDirectory 'seed'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ImporterPath = Join-Path $SeedDirectory 'apply-site-a-product-representatives.php'
$ApprovedFixturePath = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath (Join-Path $RepositoryRoot 'tests/fixtures/products/site-a-products.approved-representatives.json')).Path)

foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ImporterPath, $ApprovedFixturePath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) {
        throw "Missing required local representative-content file: $RequiredFile"
    }
}
& (Join-Path $PSScriptRoot 'assert-local-wordpress-env.ps1') -EnvironmentPath $EnvironmentFile | Out-Null

$ComposeText = Get-Content -Raw -LiteralPath $ComposeFile
if ($ComposeText -notmatch '(?m)^\s*-\s*127\.0\.0\.1:8080:80\s*$') {
    throw 'The representative-content importer requires WordPress bound only to 127.0.0.1:8080.'
}
if (
    [string]::IsNullOrWhiteSpace($FixturePath) -or
    $FixturePath.IndexOfAny([char[]]'*?') -ge 0 -or
    $FixturePath -match '^[A-Za-z][A-Za-z0-9+.-]*://'
) {
    throw 'FixturePath must be one local literal file path without wildcard or URI syntax.'
}
$ResolvedFixturePath = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $FixturePath -ErrorAction Stop).Path)
if (
    -not [string]::Equals($ResolvedFixturePath, $ApprovedFixturePath, [System.StringComparison]::OrdinalIgnoreCase) -or
    -not (Test-Path -LiteralPath $ResolvedFixturePath -PathType Leaf)
) {
    throw 'FixturePath must resolve to the approved committed Site A representative fixture.'
}

& npm test -- tests/unit/products/page-schema.test.ts tests/unit/products/page-dto.test.ts
if ($LASTEXITCODE -ne 0) {
    throw 'The approved representative fixture did not satisfy the Task 4 contracts.'
}

$EnvironmentValues = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentFile) {
    if ($Line -match '^([^#=]+)=(.*)$') {
        $EnvironmentValues[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}
$AdminUser = if ($EnvironmentValues.ContainsKey('WORDPRESS_ADMIN_USER')) {
    [string] $EnvironmentValues['WORDPRESS_ADMIN_USER']
} else {
    ''
}
if ([string]::IsNullOrWhiteSpace($AdminUser)) {
    throw 'The local WordPress environment does not declare WORDPRESS_ADMIN_USER.'
}
foreach ($UrlName in @(
    'NEXTJS_REVALIDATION_URL_TIO2_A', 'NEXTJS_REVALIDATION_URL_TIO2_B',
    'NEXTJS_PREVIEW_URL_TIO2_A', 'NEXTJS_PREVIEW_URL_TIO2_B'
)) {
    $UrlValue = if ($EnvironmentValues.ContainsKey($UrlName)) { [string] $EnvironmentValues[$UrlName] } else { '' }
    $Url = $null
    if (
        -not [Uri]::TryCreate($UrlValue, [UriKind]::Absolute, [ref] $Url) -or
        $Url.Scheme -ne 'http' -or
        $Url.Host -notin @('localhost', '127.0.0.1', 'host.docker.internal')
    ) {
        throw "The local WordPress environment contains a non-local callback URL in $UrlName."
    }
}

function New-RepresentativeCapability {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('plan', 'apply')][string] $CapabilityMode,
        [Parameter(Mandatory = $true)][string] $RuntimeFixturePath,
        [Parameter(Mandatory = $true)][string] $FixtureSha256,
        [Parameter(Mandatory = $true)][string] $PlanSha256
    )
    $TokenBytes = New-Object byte[] 32
    $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $Generator.GetBytes($TokenBytes) }
    finally { $Generator.Dispose() }
    return [ordered]@{
        version = 1
        token = -join ($TokenBytes | ForEach-Object { $_.ToString('x2') })
        mode = $CapabilityMode
        fixturePath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeFixturePath)
        fixtureSha256 = $FixtureSha256
        planSha256 = $PlanSha256
    }
}

function Get-RepresentativeSha256 {
    param([Parameter(Mandatory = $true)][string] $LiteralPath)
    $Stream = [System.IO.File]::OpenRead($LiteralPath)
    $Hasher = [System.Security.Cryptography.SHA256]::Create()
    try {
        return -join ($Hasher.ComputeHash($Stream) | ForEach-Object { $_.ToString('x2') })
    }
    finally {
        $Hasher.Dispose()
        $Stream.Dispose()
    }
}

function Invoke-RepresentativeImport {
    param([Parameter(Mandatory = $true)][hashtable] $Capability)
    $CapabilityName = '.runtime-site-a-product-representatives-capability-{0}.json' -f ([Guid]::NewGuid().ToString('N'))
    $CapabilityPath = Join-Path $SeedDirectory $CapabilityName
    try {
        [System.IO.File]::WriteAllText($CapabilityPath, ($Capability | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
        $Arguments = @(
            'compose', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml',
            'run', '--rm', '--no-TTY', '--user', '33:33',
            '-e', "TIO2_LOCAL_PRODUCT_REPRESENTATIVE_CAPABILITY=$($Capability.token)",
            'wpcli', 'wp', "--user=$AdminUser", 'eval-file',
            '/workspace/wordpress/seed/apply-site-a-product-representatives.php',
            ('/workspace/wordpress/seed/' + $CapabilityName)
        )
        $PreviousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $Output = & docker @Arguments 2>&1
            $ExitCode = $LASTEXITCODE
        }
        finally { $ErrorActionPreference = $PreviousPreference }
        foreach ($Line in $Output) { Write-Host $Line }
        if ($ExitCode -ne 0) {
            throw "Local Site A representative $($Capability.mode) failed with exit code $ExitCode."
        }
        $Marker = @($Output | ForEach-Object { [string] $_ } | Where-Object { $_ -match 'TIO2_SITE_A_PRODUCT_REPRESENTATIVE_RESULT\s+(\{.*\})' } | Select-Object -Last 1)
        if (1 -ne $Marker.Count -or $Marker[0] -notmatch 'TIO2_SITE_A_PRODUCT_REPRESENTATIVE_RESULT\s+(\{.*\})') {
            throw 'The local representative importer did not return its authenticated result marker.'
        }
        return ($Matches[1] | ConvertFrom-Json)
    }
    finally {
        if (Test-Path -LiteralPath $CapabilityPath) {
            [System.IO.File]::Delete($CapabilityPath)
        }
    }
}

$RuntimeFixtureName = '.runtime-site-a-product-representatives-{0}.json' -f ([Guid]::NewGuid().ToString('N'))
$RuntimeFixturePath = Join-Path $SeedDirectory $RuntimeFixtureName
try {
    $SourceHashBefore = Get-RepresentativeSha256 -LiteralPath $ResolvedFixturePath
    [System.IO.File]::Copy($ResolvedFixturePath, $RuntimeFixturePath, $false)
    $SourceHashAfter = Get-RepresentativeSha256 -LiteralPath $ResolvedFixturePath
    $RuntimeHash = Get-RepresentativeSha256 -LiteralPath $RuntimeFixturePath
    if ($SourceHashBefore -cne $SourceHashAfter -or $RuntimeHash -cne $SourceHashBefore) {
        throw 'The approved fixture changed while its staged snapshot was being created.'
    }
    $PlanCapability = New-RepresentativeCapability -CapabilityMode 'plan' -RuntimeFixturePath $RuntimeFixturePath -FixtureSha256 $RuntimeHash -PlanSha256 $RuntimeHash
    $PlanResult = Invoke-RepresentativeImport -Capability $PlanCapability
    if ([string]$PlanResult.fixtureSha256 -cne $RuntimeHash -or [string]$PlanResult.mode -cne 'plan') {
        throw 'The representative Plan result did not match the staged fixture hash.'
    }
    if ($Mode -eq 'Apply') {
        $ApplyCapability = New-RepresentativeCapability -CapabilityMode 'apply' -RuntimeFixturePath $RuntimeFixturePath -FixtureSha256 $RuntimeHash -PlanSha256 ([string]$PlanResult.fixtureSha256)
        $ApplyResult = Invoke-RepresentativeImport -Capability $ApplyCapability
        if ([string]$ApplyResult.fixtureSha256 -cne $RuntimeHash -or [string]$ApplyResult.mode -cne 'apply') {
            throw 'The representative Apply result did not match its exact Plan hash.'
        }
    }
}
finally {
    if (Test-Path -LiteralPath $RuntimeFixturePath) {
        [System.IO.File]::Delete($RuntimeFixturePath)
    }
}
