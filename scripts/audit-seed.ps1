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
$ManifestPath = Join-Path $WordPressDirectory 'seed/representative-content.json'
$SiteIds = @('tio2-a', 'tio2-b')
$PublicPathPattern = '^/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$'

function Build-InternalSlug {
    param([string] $SiteId, [string] $PublicPath)
    if ($PublicPath -notmatch $PublicPathPattern) { throw "Invalid public path: $PublicPath" }
    $PathSlug = if ($PublicPath -eq '/') { 'home' } else { $PublicPath.Substring(1).Replace('/', '--') }
    $InternalSlug = "$SiteId--$PathSlug"
    if ($InternalSlug.Length -gt 180) { throw "Internal slug exceeds 180 characters: $InternalSlug" }
    return $InternalSlug
}

if (-not (Test-Path -LiteralPath $ManifestPath)) { throw "Missing representative seed manifest: $ManifestPath" }
$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$RequiredSharedFixtures = [ordered]@{}
foreach ($Entity in $Manifest.sharedEntities) { $RequiredSharedFixtures[$Entity.id] = $Entity.postType }

if ($SnapshotPath) {
    $Snapshot = Get-Content -Raw -LiteralPath (Resolve-Path -LiteralPath $SnapshotPath).Path | ConvertFrom-Json
}
else {
    foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ExportScriptPath)) {
        if (-not (Test-Path -LiteralPath $RequiredFile)) { throw "Missing required local WordPress file: $RequiredFile" }
    }
    $DockerArguments = @(
        'compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile,
        'run', '--rm', '--no-TTY', '--user', '33:33', 'wpcli',
        'wp', 'eval-file', '/workspace/wordpress/seed/export-audit.php'
    )
    $PreviousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $CommandOutput = & docker @DockerArguments 2>&1
        $CommandExitCode = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $PreviousErrorActionPreference }
    if ($CommandExitCode -ne 0) {
        foreach ($OutputLine in $CommandOutput) { [Console]::Error.WriteLine($OutputLine) }
        throw "WordPress audit export failed with exit code $CommandExitCode."
    }
    $Match = [regex]::Match(
        ($CommandOutput -join "`n"),
        '(?s)TIO2_AUDIT_JSON_BEGIN\s*(.*?)\s*TIO2_AUDIT_JSON_END'
    )
    if (-not $Match.Success) { throw 'WordPress audit export did not return a JSON snapshot.' }
    $Snapshot = $Match.Groups[1].Value | ConvertFrom-Json
}

foreach ($RequiredProperty in @('routes', 'homepages', 'publicUrls', 'sharedFixtures', 'summary')) {
    if (-not ($Snapshot.PSObject.Properties.Name -contains $RequiredProperty)) {
        throw "Audit snapshot is missing production property $RequiredProperty."
    }
}

$Errors = [System.Collections.Generic.List[string]]::new()
$Routes = @($Snapshot.routes)
$Homepages = @($Snapshot.homepages)
$PublicUrls = @($Snapshot.publicUrls)
$AuditSummary = $Snapshot.summary
foreach ($SummaryProperty in @(
    'publicInventoryCount',
    'publishedHomepageCount',
    'retainedDraftPageCount',
    'retainedDraftProductCount',
    'identityChecksum',
    'crossSiteLeaks'
)) {
    if (-not ($AuditSummary.PSObject.Properties.Name -contains $SummaryProperty)) {
        throw "Audit summary is missing production property $SummaryProperty."
    }
}

function Test-ExactAuditInteger {
    param($Value, [int] $Expected)
    return ($Value -is [int] -or $Value -is [long]) -and [long]$Value -eq $Expected
}

$SummaryPublicInventoryValid =
    (Test-ExactAuditInteger $AuditSummary.publicInventoryCount.'tio2-a' 1) -and
    (Test-ExactAuditInteger $AuditSummary.publicInventoryCount.'tio2-b' 1)
if (-not $SummaryPublicInventoryValid) { $Errors.Add('Invalid audit summary publicInventoryCount.') }
$SummaryHomepageValid =
    (Test-ExactAuditInteger $AuditSummary.publishedHomepageCount.'tio2-a' 1) -and
    (Test-ExactAuditInteger $AuditSummary.publishedHomepageCount.'tio2-b' 1)
if (-not $SummaryHomepageValid) { $Errors.Add('Invalid audit summary publishedHomepageCount.') }
$LegacyDraftPages =
    (Test-ExactAuditInteger $AuditSummary.retainedDraftPageCount.'tio2-a' 0) -and
    (Test-ExactAuditInteger $AuditSummary.retainedDraftPageCount.'tio2-b' 0)
$TargetDraftPages =
    (Test-ExactAuditInteger $AuditSummary.retainedDraftPageCount.'tio2-a' 504) -and
    (Test-ExactAuditInteger $AuditSummary.retainedDraftPageCount.'tio2-b' 504)
if (-not $LegacyDraftPages -and -not $TargetDraftPages) {
    $Errors.Add('Invalid audit summary retainedDraftPageCount.')
}
$LegacyDraftProduct = Test-ExactAuditInteger $AuditSummary.retainedDraftProductCount 0
$TargetDraftProduct = Test-ExactAuditInteger $AuditSummary.retainedDraftProductCount 1
if (-not $LegacyDraftProduct -and -not $TargetDraftProduct) {
    $Errors.Add('Invalid audit summary retainedDraftProductCount.')
}
$IsLegacySummary = $LegacyDraftPages -and $LegacyDraftProduct
$IsTargetSummary = $TargetDraftPages -and $TargetDraftProduct
if (-not $IsLegacySummary -and -not $IsTargetSummary) {
    if ($LegacyDraftPages -or $TargetDraftPages) {
        $Errors.Add('Invalid audit summary retainedDraftProductCount.')
    }
    if ($LegacyDraftProduct -or $TargetDraftProduct) {
        $Errors.Add('Invalid audit summary retainedDraftPageCount.')
    }
}
if (-not (Test-ExactAuditInteger $AuditSummary.crossSiteLeaks 0)) {
    $Errors.Add('Invalid audit summary crossSiteLeaks.')
}

$IdentityRows = [System.Collections.Generic.List[object]]::new()
foreach ($Route in $Routes) {
    if ($Route.publicPath -eq '/' -or [string]$Route.supersededSeedSnapshot -ne '') { continue }
    $IdentityRows.Add([ordered]@{
        id = [int]$Route.id
        postType = [string]$Route.postType
        slug = [string]$Route.slug
        publicPath = [string]$Route.publicPath
        siteScopes = @($Route.siteScopes | ForEach-Object { [string]$_ })
    })
}
foreach ($Fixture in @($Snapshot.sharedFixtures)) {
    $FixturePublicPath = if ($Fixture.PSObject.Properties.Name -contains 'publicPath') {
        $Fixture.publicPath
    } else { $null }
    $IdentityRows.Add([ordered]@{
        id = [int]$Fixture.id
        postType = [string]$Fixture.postType
        slug = [string]$Fixture.slug
        publicPath = if ($null -eq $FixturePublicPath -or [string]$FixturePublicPath -eq '') { $null } else { [string]$FixturePublicPath }
        siteScopes = @($Fixture.siteScopes | ForEach-Object { [string]$_ })
    })
}
$IdentityJson = ConvertTo-Json -InputObject @($IdentityRows | Sort-Object { $_.id }) -Depth 6 -Compress
$Hasher = [System.Security.Cryptography.SHA256]::Create()
try {
    $IdentityHash = $Hasher.ComputeHash([System.Text.UTF8Encoding]::new($false).GetBytes($IdentityJson))
}
finally { $Hasher.Dispose() }
$RecomputedIdentityChecksum = 'sha256:' + (($IdentityHash | ForEach-Object { $_.ToString('x2') }) -join '')
$SubmittedIdentityChecksum = [string]$AuditSummary.identityChecksum
if (
    $SubmittedIdentityChecksum -notmatch '^sha256:[0-9a-f]{64}$' -or
    -not $SubmittedIdentityChecksum.Equals(
        $RecomputedIdentityChecksum,
        [System.StringComparison]::Ordinal
    )
) {
    $Errors.Add('Invalid audit summary identityChecksum.')
}
if ($IsTargetSummary -and $ExpectedPerSite -ne 1) {
    $Errors.Add('RootOnly target audit requires ExpectedPerSite 1.')
}
if ($IsLegacySummary -and $ExpectedPerSite -lt 5) {
    $Errors.Add('LegacyBaseline audit requires at least five expected public URLs per site.')
}

$ScalePageCount = if ($IsTargetSummary) { 500 } else { $ExpectedPerSite - 5 }
$ExpectedPaths = @{}
$ExpectedPublicPaths = @{}
foreach ($SiteId in $SiteIds) {
    $Paths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($CorePath in @('/', '/products', '/applications', '/about', '/contact')) { [void]$Paths.Add($CorePath) }
    for ($Index = 1; $Index -le $ScalePageCount; $Index++) {
        [void]$Paths.Add("/test-content/long-tail-$($Index.ToString('D3'))")
    }
    $ExpectedPaths[$SiteId] = $Paths
    $ExpectedPublicPaths[$SiteId] = if ($IsTargetSummary) {
        [System.Collections.Generic.HashSet[string]]::new([string[]]@('/'), [System.StringComparer]::Ordinal)
    } else { $Paths }
}

$CanonicalHomepages = @{}
foreach ($Homepage in $Homepages) {
    $IsReleasedDuplicate =
        $Homepage.status -eq 'draft' -and
        @($Homepage.siteScopes).Count -eq 0 -and
        $Homepage.slug -eq "homepage-duplicate-$($Homepage.id)" -and
        $Homepage.error -eq 'tio2_homepage_duplicate' -and
        [string]$Homepage.seedMarker -eq ''
    if ($IsReleasedDuplicate) { continue }

    $HomepageScopes = @($Homepage.siteScopes)
    $HomepageSiteId = if ($HomepageScopes.Count -eq 1 -and $SiteIds -contains $HomepageScopes[0]) {
        [string]$HomepageScopes[0]
    } else { $null }
    if (
        -not $HomepageSiteId -or
        $Homepage.siteId -ne $HomepageSiteId -or
        $Homepage.slug -ne "$HomepageSiteId--homepage" -or
        $Homepage.seedMarker -ne $HomepageSiteId -or
        $Homepage.schemaVersion -ne 'homepage-v0.1' -or
        @('publish', 'future', 'draft', 'pending', 'private', 'trash') -notcontains $Homepage.status
    ) {
        $Errors.Add("Invalid homepage inventory record $($Homepage.id).")
        continue
    }
    if ($CanonicalHomepages.ContainsKey($HomepageSiteId)) {
        $Errors.Add("Invalid homepage inventory record $($Homepage.id): duplicate owner for $HomepageSiteId.")
        continue
    }
    $CanonicalHomepages[$HomepageSiteId] = $Homepage
}

foreach ($SiteId in $SiteIds) {
    $Homes = @($Homepages | Where-Object { $_.siteId -eq $SiteId -and $_.status -eq 'publish' })
    if (
        $Homes.Count -ne 1 -or
        $Homes[0].slug -ne "$SiteId--homepage" -or
        $Homes[0].publicPath -ne '/' -or
        $Homes[0].schemaVersion -ne 'homepage-v0.1' -or
        $Homes[0].seedMarker -ne $SiteId -or
        -not [bool]$Homes[0].uriResolvable -or
        $Homes[0].uriResolutionSource -ne 'wpgraphql'
    ) { $Errors.Add("Invalid published homepage identity for $SiteId.") }
    if (-not $CanonicalHomepages.ContainsKey($SiteId) -or -not [bool]$CanonicalHomepages[$SiteId].uriResolvable) {
        $Errors.Add("Homepage GraphQL contract did not resolve for $SiteId.")
    }

    $RootBackups = @($Routes | Where-Object {
        $_.publicPath -eq '/' -and @($_.previousRootSiteScopes) -contains $SiteId
    })
    if (
        $RootBackups.Count -ne 1 -or
        $RootBackups[0].postType -ne 'page' -or
        $RootBackups[0].status -ne 'draft' -or
        $RootBackups[0].slug -ne "$SiteId--home" -or
        $RootBackups[0].seedMarker -ne "$SiteId--home" -or
        @($RootBackups[0].siteScopes).Count -ne 0 -or
        $RootBackups[0].previousRootStatus -ne 'publish' -or
        @($RootBackups[0].previousRootSiteScopes).Count -ne 1
    ) { $Errors.Add("Invalid retained root Page migration snapshot for $SiteId.") }

    $SiteUrls = @($PublicUrls | Where-Object { $_.siteId -eq $SiteId })
    if ($SiteUrls.Count -ne $ExpectedPerSite) {
        $Errors.Add("Expected $ExpectedPerSite public URLs for $SiteId, found $($SiteUrls.Count).")
    }
    $UrlKeys = @($SiteUrls | ForEach-Object { "$($_.siteId):$($_.path)" })
    if (@($UrlKeys | Sort-Object -Unique).Count -ne $UrlKeys.Count) {
        $Errors.Add("Duplicate public path for $SiteId.")
    }
    $NonRootUrls = @($SiteUrls | Where-Object { $_.path -ne '/' })
    if ($NonRootUrls.Count -ne ($ExpectedPerSite - 1)) {
        $Errors.Add("Expected $($ExpectedPerSite - 1) non-root Page owners for $SiteId, found $($NonRootUrls.Count).")
    }
    foreach ($NonRootUrl in $NonRootUrls) {
        if ($NonRootUrl.ownerType -ne 'page') {
            $Errors.Add("Non-root URL $SiteId`:$($NonRootUrl.path) must be owned by a Page.")
        }
    }

    foreach ($Url in $SiteUrls) {
        if (-not $ExpectedPublicPaths[$SiteId].Contains([string]$Url.path)) {
            $Errors.Add("Unexpected published path for $SiteId`: $($Url.path).")
            continue
        }
        if ($Url.path -eq '/') {
            if (
                $Url.ownerType -ne 'homepage' -or
                $Url.slug -ne "$SiteId--homepage" -or
                @($Url.siteScopes).Count -ne 1 -or
                @($Url.siteScopes)[0] -ne $SiteId -or
                -not [bool]$Url.uriResolvable -or
                $Url.uriResolutionSource -ne 'wpgraphql'
            ) { $Errors.Add("Invalid homepage public URL for $SiteId.") }
            continue
        }

        $MatchingRoutes = @($Routes | Where-Object { $_.id -eq $Url.ownerId })
        if ($MatchingRoutes.Count -ne 1) {
            $Errors.Add("Public URL $SiteId`:$($Url.path) has no unique route owner record.")
            continue
        }
        $Route = $MatchingRoutes[0]
        $ExpectedSlug = Build-InternalSlug -SiteId $SiteId -PublicPath ([string]$Url.path)
        if (
            $Route.status -ne 'publish' -or
            $Route.publicPath -ne $Url.path -or
            $Route.slug -ne $ExpectedSlug -or
            $Url.slug -ne $ExpectedSlug -or
            @($Route.siteScopes).Count -ne 1 -or
            @($Route.siteScopes)[0] -ne $SiteId -or
            @($Url.siteScopes).Count -ne 1 -or
            @($Url.siteScopes)[0] -ne $SiteId
        ) { $Errors.Add("Route $($Route.id) scope/path/slug does not match $SiteId`:$($Url.path).") }
        if (
            $Route.uriResolutionSource -ne 'wpgraphql' -or
            -not [bool]$Route.uriResolvable -or
            $Url.uriResolutionSource -ne 'wpgraphql' -or
            -not [bool]$Url.uriResolvable
        ) { $Errors.Add("Route $($Route.id) is not resolvable through WPGraphQL URI $($Route.slug).") }
    }

    foreach ($ExpectedPath in $ExpectedPublicPaths[$SiteId]) {
        if (@($SiteUrls | Where-Object { $_.path -eq $ExpectedPath }).Count -ne 1) {
            $Errors.Add("Missing expected published path for $SiteId`: $ExpectedPath.")
        }
    }
}

foreach ($Route in $Routes) {
    if ($Route.publicPath -eq '/') { continue }
    if ([string]$Route.supersededSeedSnapshot -ne '') {
        $SnapshotData = $null
        try { $SnapshotData = [string]$Route.supersededSeedSnapshot | ConvertFrom-Json }
        catch { $SnapshotData = $null }
        $SnapshotProperties = if ($null -ne $SnapshotData) {
            @($SnapshotData.PSObject.Properties | ForEach-Object { $_.Name })
        } else { @() }
        $SnapshotHasShape = @('status', 'slug', 'publicPath', 'siteScopes') |
            Where-Object { $SnapshotProperties -notcontains $_ } |
            Measure-Object |
            Select-Object -ExpandProperty Count
        if ($null -eq $SnapshotData -or $SnapshotHasShape -ne 0) {
            $Errors.Add("Invalid superseded seed snapshot for route $($Route.id).")
            continue
        }
        $SnapshotScopes = @($SnapshotData.siteScopes)
        $Match = [regex]::Match([string]$Route.publicPath, '^/test-content/long-tail-([1-9][0-9]{0,2})$')
        $SiteId = if (@($Route.siteScopes).Count -eq 1) { [string]@($Route.siteScopes)[0] } else { '' }
        $ExpectedLegacySlug = if ($Match.Success) { "$SiteId--test-content--long-tail-$($Match.Groups[1].Value)" } else { '' }
        $PaddedPath = if ($Match.Success) { "/test-content/long-tail-$(([int]$Match.Groups[1].Value).ToString('D3'))" } else { '' }
        if (
            $Route.status -ne 'draft' -or
            $SiteIds -notcontains $SiteId -or
            $Route.slug -ne $ExpectedLegacySlug -or
            $Route.seedMarker -ne $ExpectedLegacySlug -or
            $SnapshotData.status -ne 'publish' -or
            $SnapshotData.slug -ne $Route.slug -or
            $SnapshotData.publicPath -ne $Route.publicPath -or
            $SnapshotScopes.Count -ne 1 -or
            $SnapshotScopes[0] -ne $SiteId -or
            @($Route.siteScopes).Count -ne 1 -or
            @($Route.siteScopes)[0] -ne $SiteId -or
            -not $ExpectedPaths[$SiteId].Contains($PaddedPath)
        ) {
            $Errors.Add("Invalid superseded seed snapshot for route $($Route.id).")
        }
        continue
    }
    $Scopes = @($Route.siteScopes)
    $SiteId = if ($Scopes.Count -eq 1 -and $SiteIds -contains $Scopes[0]) { [string]$Scopes[0] } else { $null }
    if (-not $SiteId) {
        $Errors.Add("Managed route $($Route.id) must have exactly one supported site_scope.")
        continue
    }
    if (-not $ExpectedPaths[$SiteId].Contains([string]$Route.publicPath)) {
        $Errors.Add("Unexpected retained route for $SiteId`: $($Route.publicPath).")
    }
    $ExpectedRouteStatus = if ($IsTargetSummary) { 'draft' } else { 'publish' }
    if ($Route.status -ne $ExpectedRouteStatus) {
        $ExpectedStatusLabel = if ($IsTargetSummary) { 'draft' } else { 'published' }
        $Errors.Add("Managed route $($Route.id) must be $ExpectedStatusLabel; found $($Route.status).")
    }
}

foreach ($FixtureId in $RequiredSharedFixtures.Keys) {
    $ExpectedPostType = $RequiredSharedFixtures[$FixtureId]
    $Matches = @($Snapshot.sharedFixtures | Where-Object { $_.fixtureId -eq $FixtureId })
    if ($Matches.Count -ne 1) {
        $Errors.Add("Expected exactly one shared fixture $FixtureId, found $($Matches.Count).")
        continue
    }
    $Fixture = $Matches[0]
    if ($Fixture.slug -ne $FixtureId) { $Errors.Add("Shared fixture $FixtureId has slug $($Fixture.slug), expected $FixtureId.") }
    if ($IsTargetSummary -and $FixtureId -eq 'test-product-reference') {
        if ($Fixture.status -ne 'draft') { $Errors.Add("Shared fixture $FixtureId must be draft; found $($Fixture.status).") }
        if (@($Fixture.siteScopes).Count -ne 1 -or @($Fixture.siteScopes)[0] -ne 'tio2-a') {
            $Errors.Add("Shared fixture $FixtureId must have exact target site_scope tio2-a.")
        }
    }
    else {
        if ($Fixture.status -ne 'publish') { $Errors.Add("Shared fixture $FixtureId must be published; found $($Fixture.status).") }
        if (@($Fixture.siteScopes).Count -ne 0) { $Errors.Add("Shared fixture $FixtureId must have no site_scope; found $(@($Fixture.siteScopes).Count).") }
    }
    if ($Fixture.postType -ne $ExpectedPostType) { $Errors.Add("Shared fixture $FixtureId has post type $($Fixture.postType), expected $ExpectedPostType.") }
}

if ($Errors.Count -gt 0) {
    foreach ($AuditError in $Errors) { [Console]::Error.WriteLine($AuditError) }
    exit 1
}
foreach ($SiteId in $SiteIds) { Write-Output "$SiteId`: $ExpectedPerSite public URLs" }
Write-Output "TIO2_AUDIT_SUMMARY $($AuditSummary | ConvertTo-Json -Depth 6 -Compress)"
Write-Output 'Seed audit passed.'
