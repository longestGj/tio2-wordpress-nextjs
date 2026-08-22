[CmdletBinding()]
param(
    [ValidateRange(5, 100000)]
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
$ManifestPath = Join-Path $WordPressDirectory 'seed/representative-content.json'
$SiteIds = @('tio2-a', 'tio2-b')
$RequiredSharedFixtures = [ordered]@{}
if (-not (Test-Path -LiteralPath $ManifestPath)) {
    throw "Missing representative seed manifest: $ManifestPath"
}
$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
foreach ($Entity in $Manifest.sharedEntities) {
    $RequiredSharedFixtures[$Entity.id] = $Entity.postType
}
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
$ExpectedPaths = @{}
$ScalePageCount = $ExpectedPerSite - 5
foreach ($SiteId in $SiteIds) {
    $SiteExpectedPaths = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::Ordinal
    )
    foreach ($CorePath in @('/', '/products', '/applications', '/about', '/contact')) {
        [void]$SiteExpectedPaths.Add($CorePath)
    }
    for ($Index = 1; $Index -le $ScalePageCount; $Index++) {
        [void]$SiteExpectedPaths.Add("/test-content/long-tail-$($Index.ToString('D3'))")
    }
    $ExpectedPaths[$SiteId] = $SiteExpectedPaths
}

foreach ($Page in $Pages) {
    $ExpectedSiteId = $null
    foreach ($SiteId in $SiteIds) {
        if ([string]$Page.slug -like "$SiteId--*") {
            $ExpectedSiteId = $SiteId
            break
        }
    }

    $PageScopes = @($Page.siteScopes)
    if (-not $ExpectedSiteId -and $PageScopes.Count -eq 1 -and $SiteIds -contains $PageScopes[0]) {
        $ExpectedSiteId = $PageScopes[0]
    }

    if (-not $ExpectedSiteId) {
        $Errors.Add("Cannot infer site from page slug $($Page.slug) (post $($Page.id)).")
        continue
    }

    if ($Page.status -ne 'publish') {
        $Errors.Add("Managed fixture page $($Page.id) must be published; found $($Page.status).")
    }
    elseif (
        $Page.uriResolutionSource -ne 'wpgraphql' -or
        -not [bool]$Page.uriResolvable
    ) {
        $Errors.Add("Page $($Page.id) is not resolvable through WPGraphQL URI $($Page.slug).")
    }

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

    foreach ($ExpectedPath in $ExpectedPaths[$SiteId]) {
        if (-not $PublishedPaths[$SiteId].Contains($ExpectedPath)) {
            $Errors.Add("Missing expected published path for $SiteId`: $ExpectedPath.")
        }
    }
    foreach ($ActualPath in $PublishedPaths[$SiteId]) {
        if (-not $ExpectedPaths[$SiteId].Contains($ActualPath)) {
            $Errors.Add("Unexpected published path for $SiteId`: $ActualPath.")
        }
    }
}

foreach ($FixtureId in $RequiredSharedFixtures.Keys) {
    $ExpectedPostType = $RequiredSharedFixtures[$FixtureId]
    $MatchingFixtures = @($Snapshot.sharedFixtures | Where-Object { $_.fixtureId -eq $FixtureId })
    if ($MatchingFixtures.Count -ne 1) {
        $Errors.Add("Expected exactly one shared fixture $FixtureId, found $($MatchingFixtures.Count).")
        continue
    }

    $Fixture = $MatchingFixtures[0]
    if ($Fixture.slug -ne $FixtureId) {
        $Errors.Add("Shared fixture $FixtureId has slug $($Fixture.slug), expected $FixtureId.")
    }
    if ($Fixture.status -ne 'publish') {
        $Errors.Add("Shared fixture $FixtureId must be published; found $($Fixture.status).")
    }
    if ($Fixture.postType -ne $ExpectedPostType) {
        $Errors.Add("Shared fixture $FixtureId has post type $($Fixture.postType), expected $ExpectedPostType.")
    }
    $FixtureScopes = @($Fixture.siteScopes)
    if ($FixtureScopes.Count -ne 0) {
        $Errors.Add("Shared fixture $FixtureId must have no site_scope; found $($FixtureScopes.Count).")
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
foreach ($FixtureId in $RequiredSharedFixtures.Keys) {
    Write-Output "$($RequiredSharedFixtures[$FixtureId])`: 1 published shared fixture ($FixtureId)"
}
Write-Output 'Seed audit passed.'
