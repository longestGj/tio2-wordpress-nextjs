[CmdletBinding()]
param(
    [ValidateRange(0, 10000)]
    [int] $ScalePages = 0,
    [switch] $PlanOnly,
    [ValidateSet('', 'before-homepage-write', 'after-root-release')]
    [string] $FailurePoint = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$ManifestPath = Join-Path $WordPressDirectory 'seed/representative-content.json'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ApplyScriptPath = Join-Path $WordPressDirectory 'seed/apply-seed.php'
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

function New-PageOperation {
    param(
        [Parameter(Mandatory = $true)]
        [string] $SiteId,
        [Parameter(Mandatory = $true)]
        [string] $PublicPath,
        [Parameter(Mandatory = $true)]
        [string] $Title,
        [Parameter(Mandatory = $true)]
        [string] $Content,
        [Parameter(Mandatory = $true)]
        [string] $SeoTitle,
        [Parameter(Mandatory = $true)]
        [string] $SeoDescription
    )

    $InternalSlug = Build-InternalSlug -SiteId $SiteId -PublicPath $PublicPath

    return [PSCustomObject]@{
        siteId = $SiteId
        publicPath = $PublicPath
        internalSlug = $InternalSlug
        postStatus = 'publish'
        title = $Title
        content = $Content
        siteScopes = @($SiteId)
        meta = [PSCustomObject]@{
            public_path = $PublicPath
            seo_title = $SeoTitle
            seo_description = $SeoDescription
            _tio2_seed_internal_slug = $InternalSlug
        }
    }
}

if (-not (Test-Path -LiteralPath $ManifestPath)) {
    throw "Missing representative seed manifest: $ManifestPath"
}

$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$SiteIds = @($Manifest.sites | ForEach-Object { $_.siteId })
if ($SiteIds.Count -ne 2 -or $SiteIds -notcontains 'tio2-a' -or $SiteIds -notcontains 'tio2-b') {
    throw 'Representative seed manifest must contain exactly tio2-a and tio2-b.'
}

$Entities = @(
    foreach ($Entity in $Manifest.sharedEntities) {
        [PSCustomObject]@{
            id = $Entity.id
            postType = $Entity.postType
            slug = $Entity.id
            postStatus = 'publish'
            title = $Entity.title
            content = $Entity.content
            meta = [PSCustomObject]@{
                technical_summary = $Entity.technicalSummary
                evidence_source_url = $Entity.evidenceSourceUrl
                _tio2_seed_fixture_id = $Entity.id
            }
            referencedBySites = @($SiteIds)
        }
    }
)

$Pages = [System.Collections.Generic.List[object]]::new()
$Homepages = [System.Collections.Generic.List[object]]::new()
$PageKeys = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::Ordinal
)

foreach ($Site in $Manifest.sites) {
    $Homepages.Add([PSCustomObject]@{
        siteId = $Site.siteId
        internalSlug = "$($Site.siteId)--homepage"
        postStatus = 'draft'
        title = $Site.homepage.hero_heading
        fields = $Site.homepage
        marker = $Site.siteId
    })
    foreach ($Page in $Site.pages) {
        $PageKey = "$($Site.siteId):$($Page.publicPath)"
        if (-not $PageKeys.Add($PageKey)) {
            throw "Duplicate representative page: $PageKey"
        }

        $Pages.Add((New-PageOperation `
            -SiteId $Site.siteId `
            -PublicPath $Page.publicPath `
            -Title $Page.title `
            -Content $Page.content `
            -SeoTitle $Page.seoTitle `
            -SeoDescription $Page.seoDescription))
    }

    for ($Index = 1; $Index -le $ScalePages; $Index++) {
        $Ordinal = $Index.ToString('D3')
        $PublicPath = "/test-content/long-tail-$Ordinal"
        $PageKey = "$($Site.siteId):$PublicPath"
        if (-not $PageKeys.Add($PageKey)) {
            throw "Duplicate scale page: $PageKey"
        }

        $RouteTitle = "$($Site.siteId) Synthetic Test Long-tail Page $Ordinal"
        $RouteSummary = "Deterministic local scale fixture $Ordinal for $($Site.siteId); it contains no verified commercial or technical TiO2 claim."
        if ($Index -eq 1) {
            $RouteTitle = $Site.homepage.product_routes[1].product_title
            $RouteSummary = $Site.homepage.product_routes[1].product_summary
        }
        elseif ($Index -ge 2 -and $Index -le 5) {
            $Application = $Site.homepage.applications[$Index - 1]
            $RouteTitle = $Application.application_name
            $RouteSummary = $Application.application_summary
        }

        $Pages.Add((New-PageOperation `
            -SiteId $Site.siteId `
            -PublicPath $PublicPath `
            -Title $RouteTitle `
            -Content "<p><strong>SYNTHETIC TEST CONTENT.</strong> $RouteSummary</p>" `
            -SeoTitle "$($Site.siteId) $RouteTitle" `
            -SeoDescription "SYNTHETIC TEST CONTENT. $RouteSummary"))
    }
}

$Plan = [PSCustomObject]@{
    schemaVersion = 1
    contentNotice = $Manifest.contentNotice
    scalePagesPerSite = $ScalePages
    failurePoint = $FailurePoint
    entities = @($Entities)
    pages = @($Pages)
    homepages = @($Homepages)
    managedScaleSlugPrefixes = @(
        'tio2-a--test-content--long-tail-'
        'tio2-b--test-content--long-tail-'
    )
}

if ($PlanOnly) {
    $Plan | ConvertTo-Json -Depth 10
    exit 0
}

foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ApplyScriptPath)) {
    if (-not (Test-Path -LiteralPath $RequiredFile)) {
        throw "Missing required local WordPress file: $RequiredFile"
    }
}

$RuntimePlanName = ".runtime-seed-plan-$([Guid]::NewGuid().ToString('N')).json"
$RuntimePlanPath = Join-Path (Join-Path $WordPressDirectory 'seed') $RuntimePlanName
$ContainerPlanPath = "/workspace/wordpress/seed/$RuntimePlanName"

try {
    $PlanJson = $Plan | ConvertTo-Json -Depth 10 -Compress
    [System.IO.File]::WriteAllText(
        $RuntimePlanPath,
        $PlanJson,
        [System.Text.UTF8Encoding]::new($false)
    )

    $DockerArguments = @(
        'compose',
        '--env-file', $EnvironmentFile,
        '-f', $ComposeFile,
        'run', '--rm', '--no-TTY', '--user', '33:33',
        'wpcli',
        'wp', 'eval-file', '/workspace/wordpress/seed/apply-seed.php', $ContainerPlanPath
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
        throw "WordPress seed batch failed with exit code $CommandExitCode."
    }
}
finally {
    if (Test-Path -LiteralPath $RuntimePlanPath) {
        Remove-Item -LiteralPath $RuntimePlanPath -Force
    }
}

Write-Host "Seed batch complete: $($Entities.Count) optional schema fixtures and $($Pages.Count) site pages planned."
