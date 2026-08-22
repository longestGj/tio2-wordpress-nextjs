[CmdletBinding()]
param(
    [ValidateRange(1, 100000)]
    [int] $ExpectedPerSite = 505,
    [string] $SnapshotPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ExportScriptPath = Join-Path $WordPressDirectory 'seed/export-audit.php'
$SiteIds = @('tio2-a', 'tio2-b')
$RequiredPostTypes = @(
    'tio2_product',
    'tio2_grade',
    'tio2_application',
    'tio2_document',
    'tio2_faq'
)
$PublicPathPattern = '^/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$'

function Build-InternalSlug {
    param(
        [Parameter(Mandatory = $true)]
        [string] $SiteId,
        [Parameter(Mandatory = $true)]
        [string] $PublicPath
    )

    if ($PublicPath -notmatch $PublicPathPattern) {
        throw "Invalid public path: $PublicPath"
    }

    $PathSlug = if ($PublicPath -eq '/') {
        'home'
    }
    else {
        $PublicPath.Substring(1).Replace('/', '--')
    }

    $InternalSlug = "$SiteId--$PathSlug"
    if ($InternalSlug.Length -gt 180) {
        throw "Internal slug exceeds 180 characters: $InternalSlug"
    }

    return $InternalSlug
}

if ($SnapshotPath) {
    $ResolvedSnapshotPath = (Resolve-Path -LiteralPath $SnapshotPath).Path
    $Snapshot = Get-Content -Raw -LiteralPath $ResolvedSnapshotPath | ConvertFrom-Json
}
else {
    foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ExportScriptPath)) {
        if (-not (Test-Path -LiteralPath $RequiredFile)) {
            throw "Missing required local WordPress file: $RequiredFile"
        }
    }

    $DockerArguments = @(
        'compose',
        '--env-file', $EnvironmentFile,
        '-f', $ComposeFile,
        'run', '--rm', '--no-TTY', '--user', '33:33',
        'wpcli',
        'wp', 'eval-file', '/workspace/wordpress/seed/export-audit.php'
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

    if ($CommandExitCode -ne 0) {
        foreach ($OutputLine in $CommandOutput) {
            [Console]::Error.WriteLine($OutputLine)
        }
        throw "WordPress audit export failed with exit code $CommandExitCode."
    }

    $CombinedOutput = $CommandOutput -join "`n"
    $Match = [regex]::Match(
        $CombinedOutput,
        '(?s)TIO2_AUDIT_JSON_BEGIN\s*(.*?)\s*TIO2_AUDIT_JSON_END'
    )
    if (-not $Match.Success) {
        throw "WordPress audit export did not return a JSON snapshot.`n$CombinedOutput"
    }

    $Snapshot = $Match.Groups[1].Value | ConvertFrom-Json
}

$Errors = [System.Collections.Generic.List[string]]::new()
$Pages = @($Snapshot.pages)
$SeenPaths = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
)
$PublishedCounts = @{
    'tio2-a' = 0
    'tio2-b' = 0
}
$PublishedPaths = @{
    'tio2-a' = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    'tio2-b' = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
}

foreach ($Page in $Pages) {
    $ExpectedSiteId = $null
    foreach ($SiteId in $SiteIds) {
        if ([string]$Page.slug -like "$SiteId--*") {
            $ExpectedSiteId = $SiteId
            break
        }
    }

    if (-not $ExpectedSiteId) {
        $Errors.Add("Cannot infer site from page slug $($Page.slug) (post $($Page.id)).")
        continue
    }

    if (-not [bool]$Page.uriResolvable) {
        $Errors.Add("Page $($Page.id) is not resolvable by its internal URI $($Page.slug).")
    }

    $PageScopes = @($Page.siteScopes)
    if ($PageScopes.Count -ne 1) {
        $Errors.Add("Page $($Page.id) must have exactly one site_scope; found $($PageScopes.Count).")
    }
    elseif ($PageScopes[0] -ne $ExpectedSiteId) {
        $Errors.Add("Page $($Page.id) scope does not match slug: expected $ExpectedSiteId, found $($PageScopes[0]).")
    }

    try {
        $ExpectedSlug = Build-InternalSlug -SiteId $ExpectedSiteId -PublicPath ([string]$Page.publicPath)
        if ($Page.slug -ne $ExpectedSlug) {
            $Errors.Add("Page $($Page.id) slug mismatch: expected $ExpectedSlug, found $($Page.slug).")
        }
    }
    catch {
        $Errors.Add("Page $($Page.id) has invalid public path $($Page.publicPath): $($_.Exception.Message)")
    }

    $PathKey = "$ExpectedSiteId`:$($Page.publicPath)"
    if (-not $SeenPaths.Add($PathKey)) {
        $Errors.Add("Duplicate public path for $ExpectedSiteId`: $($Page.publicPath).")
    }

    if ($Page.status -eq 'publish') {
        $PublishedCounts[$ExpectedSiteId]++
        [void]$PublishedPaths[$ExpectedSiteId].Add([string]$Page.publicPath)
    }
}

foreach ($SiteId in $SiteIds) {
    $ActualCount = $PublishedCounts[$SiteId]
    if ($ActualCount -ne $ExpectedPerSite) {
        $Errors.Add("Expected $ExpectedPerSite published pages for $SiteId, found $ActualCount.")
    }

    if ($ExpectedPerSite -ge 5) {
        foreach ($CorePath in @('/', '/products', '/applications', '/about', '/contact')) {
            if (-not $PublishedPaths[$SiteId].Contains($CorePath)) {
                $Errors.Add("Missing published core path for $SiteId`: $CorePath.")
            }
        }
    }
}

foreach ($PostType in $RequiredPostTypes) {
    $CountProperty = $Snapshot.sharedEntityCounts.PSObject.Properties[$PostType]
    $EntityCount = if ($null -eq $CountProperty) { 0 } else { [int]$CountProperty.Value }
    if ($EntityCount -lt 1) {
        $Errors.Add("Missing shared entity records for $PostType.")
    }
}

if ($Errors.Count -gt 0) {
    foreach ($AuditError in $Errors) {
        [Console]::Error.WriteLine($AuditError)
    }
    exit 1
}

foreach ($SiteId in $SiteIds) {
    Write-Output "$SiteId`: $($PublishedCounts[$SiteId]) published pages"
}
foreach ($PostType in $RequiredPostTypes) {
    $EntityCount = [int]$Snapshot.sharedEntityCounts.PSObject.Properties[$PostType].Value
    Write-Output "$PostType`: $EntityCount published shared records"
}
Write-Output 'Seed audit passed.'
