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

foreach ($RequiredProperty in @('routes', 'homepages', 'publicUrls', 'sharedFixtures')) {
    if (-not ($Snapshot.PSObject.Properties.Name -contains $RequiredProperty)) {
        throw "Audit snapshot is missing production property $RequiredProperty."
    }
}

$Errors = [System.Collections.Generic.List[string]]::new()
$Routes = @($Snapshot.routes)
$Homepages = @($Snapshot.homepages)
$PublicUrls = @($Snapshot.publicUrls)
$ScalePageCount = $ExpectedPerSite - 5
$ExpectedPaths = @{}
foreach ($SiteId in $SiteIds) {
    $Paths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($CorePath in @('/', '/products', '/applications', '/about', '/contact')) { [void]$Paths.Add($CorePath) }
    for ($Index = 1; $Index -le $ScalePageCount; $Index++) {
        [void]$Paths.Add("/test-content/long-tail-$($Index.ToString('D3'))")
    }
    $ExpectedPaths[$SiteId] = $Paths
}

foreach ($SiteId in $SiteIds) {
    $Homes = @($Homepages | Where-Object { $_.siteId -eq $SiteId -and $_.status -eq 'publish' })
    if (
        $Homes.Count -ne 1 -or
        $Homes[0].slug -ne "$SiteId--homepage" -or
        $Homes[0].publicPath -ne '/' -or
        $Homes[0].schemaVersion -ne 'homepage-v0.1' -or
        $Homes[0].seedMarker -ne $SiteId
    ) { $Errors.Add("Invalid published homepage identity for $SiteId.") }

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

    foreach ($Url in $SiteUrls) {
        if (-not $ExpectedPaths[$SiteId].Contains([string]$Url.path)) {
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
                $Url.uriResolutionSource -ne 'homepage-contract'
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

    foreach ($ExpectedPath in $ExpectedPaths[$SiteId]) {
        if (@($SiteUrls | Where-Object { $_.path -eq $ExpectedPath }).Count -ne 1) {
            $Errors.Add("Missing expected published path for $SiteId`: $ExpectedPath.")
        }
    }
}

foreach ($Route in $Routes) {
    if ($Route.publicPath -eq '/') { continue }
    if ([string]$Route.supersededSeedSnapshot -ne '') {
        if ($Route.status -ne 'draft') {
            $Errors.Add("Superseded seed route $($Route.id) must remain recoverable as draft.")
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
    if ($Route.status -ne 'publish') {
        $Errors.Add("Managed route $($Route.id) must be published; found $($Route.status).")
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
    if ($Fixture.status -ne 'publish') { $Errors.Add("Shared fixture $FixtureId must be published; found $($Fixture.status).") }
    if ($Fixture.postType -ne $ExpectedPostType) { $Errors.Add("Shared fixture $FixtureId has post type $($Fixture.postType), expected $ExpectedPostType.") }
    if (@($Fixture.siteScopes).Count -ne 0) { $Errors.Add("Shared fixture $FixtureId must have no site_scope; found $(@($Fixture.siteScopes).Count).") }
}

if ($Errors.Count -gt 0) {
    foreach ($AuditError in $Errors) { [Console]::Error.WriteLine($AuditError) }
    exit 1
}
foreach ($SiteId in $SiteIds) { Write-Output "$SiteId`: $ExpectedPerSite public URLs" }
Write-Output 'Seed audit passed.'
