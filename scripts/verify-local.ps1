[CmdletBinding()]
param(
    [switch] $Plan
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$GateNames = @(
    'compose',
    'wordpress-smoke',
    'seed-audit',
    'lint',
    'typecheck',
    'codegen',
    'vitest',
    'vitest-live-seed',
    'build-tio2-a',
    'build-tio2-b',
    'launch',
    'playwright',
    'http-audit',
    'tracked-worktree'
)

if ($Plan) {
    [ordered]@{mode = 'plan'; ports = @(3001, 3002); gates = $GateNames} |
        ConvertTo-Json -Depth 4 -Compress
    exit 0
}

$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$Controller = Join-Path $PSScriptRoot 'start-local-sites.ps1'
$LogDirectory = Join-Path $RepositoryRoot '.tmp/local-verify'
$GateResults = [System.Collections.Generic.List[object]]::new()
$SitesStartedByGate = $false
$LaunchState = $null
$PendingError = $null
$SuccessSummary = $null
$ExpectedPerSite = 505

if (-not (Test-Path -LiteralPath $EnvironmentFile)) {
    throw 'Missing wordpress/.env. Copy wordpress/.env.example before verification.'
}
New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null

function Write-GateMessage {
    param([Parameter(Mandatory = $true)][string] $Message)
    [Console]::Error.WriteLine($Message)
}

function Invoke-NativeLogged {
    param(
        [Parameter(Mandatory = $true)][string] $FilePath,
        [Parameter(Mandatory = $true)][string[]] $Arguments,
        [Parameter(Mandatory = $true)][string] $LogName
    )

    $LogPath = Join-Path $LogDirectory "$LogName.log"
    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $FilePath @Arguments *> $LogPath
        $ExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $PreviousPreference
    }

    if ($ExitCode -ne 0) {
        Write-GateMessage "Command failed with exit code $ExitCode. Log: $LogPath"
        foreach ($Line in @(Get-Content -Tail 40 -LiteralPath $LogPath -ErrorAction SilentlyContinue)) {
            [Console]::Error.WriteLine($Line)
        }
        throw "Native command failed: $FilePath"
    }
}

function Invoke-ControllerStart {
    $StandardOutput = Join-Path $LogDirectory 'launch.log'
    $StandardError = Join-Path $LogDirectory 'launch.stderr.log'
    foreach ($Path in @($StandardOutput, $StandardError)) {
        if (Test-Path -LiteralPath $Path) {
            Remove-Item -LiteralPath $Path -Force
        }
    }

    $Process = Start-Process `
        -FilePath $PowerShell `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Controller, '-KeepRunning') `
        -WorkingDirectory $RepositoryRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $StandardOutput `
        -RedirectStandardError $StandardError `
        -PassThru
    if (-not $Process.WaitForExit(150000)) {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        throw 'The local site controller parent did not exit within 150 seconds.'
    }
    $ExitCode = $null
    try {
        $Process.Refresh()
        if ($Process.HasExited) {
            $ExitCode = $Process.ExitCode
        }
    }
    catch {
        # Windows PowerShell can leave ExitCode unavailable after a timed wait.
    }

    try {
        $script:LaunchState = Get-Content -Raw -LiteralPath $StandardOutput | ConvertFrom-Json
    }
    catch {
        foreach ($Line in @(Get-Content -Tail 40 -LiteralPath $StandardError -ErrorAction SilentlyContinue)) {
            [Console]::Error.WriteLine($Line)
        }
        throw 'The local site controller did not emit valid JSON state.'
    }
    if ($script:LaunchState.mode -eq 'running' -and @($script:LaunchState.sites).Count -eq 2) {
        $script:SitesStartedByGate = $true
    }

    if ($null -ne $ExitCode -and [int]$ExitCode -ne 0) {
        foreach ($Line in @(Get-Content -Tail 40 -LiteralPath $StandardError -ErrorAction SilentlyContinue)) {
            [Console]::Error.WriteLine($Line)
        }
        throw "The local site controller exited with code $ExitCode."
    }
}

function Invoke-WithEnvironment {
    param(
        [Parameter(Mandatory = $true)][hashtable] $Values,
        [Parameter(Mandatory = $true)][scriptblock] $Action
    )

    $PreviousValues = @{}
    foreach ($Name in $Values.Keys) {
        $PreviousValues[$Name] = [Environment]::GetEnvironmentVariable($Name, 'Process')
    }
    try {
        foreach ($Name in $Values.Keys) {
            [Environment]::SetEnvironmentVariable($Name, $Values[$Name], 'Process')
        }
        $null = & $Action
    }
    finally {
        foreach ($Name in $PreviousValues.Keys) {
            [Environment]::SetEnvironmentVariable($Name, $PreviousValues[$Name], 'Process')
        }
    }
}

function Invoke-Gate {
    param(
        [Parameter(Mandatory = $true)][string] $Name,
        [Parameter(Mandatory = $true)][scriptblock] $Action
    )

    Write-GateMessage "[$Name] starting"
    $Timer = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $null = & $Action
        $Timer.Stop()
        $GateResults.Add([ordered]@{
            name = $Name
            status = 'passed'
            durationMs = $Timer.ElapsedMilliseconds
        }) | Out-Null
        Write-GateMessage "[$Name] passed in $($Timer.ElapsedMilliseconds) ms"
    }
    catch {
        $Timer.Stop()
        Write-GateMessage "[$Name] failed in $($Timer.ElapsedMilliseconds) ms: $($_.Exception.Message)"
        throw
    }
}

function Get-TrackedSnapshot {
    $Lines = @(& git status --porcelain=v1 --untracked-files=no)
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not read tracked worktree status.'
    }
    return ($Lines -join "`n")
}

function Get-PassedCount {
    param(
        [Parameter(Mandatory = $true)][string] $LogName,
        [Parameter(Mandatory = $true)][string] $Pattern
    )

    $Text = Get-Content -Raw -LiteralPath (Join-Path $LogDirectory "$LogName.log")
    $Match = [regex]::Match($Text, $Pattern)
    if (-not $Match.Success) {
        throw "Could not read a test count from $LogName.log."
    }
    return [int]$Match.Groups[1].Value
}

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string] $Path)

    $Stream = [System.IO.File]::OpenRead($Path)
    $Hasher = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($Hasher.ComputeHash($Stream))).Replace('-', '')
    }
    finally {
        $Hasher.Dispose()
        $Stream.Dispose()
    }
}

function Invoke-Http {
    param(
        [Parameter(Mandatory = $true)][string] $Url,
        [ValidateSet('GET', 'POST')][string] $Method = 'GET',
        [string] $Body,
        [hashtable] $Headers = @{}
    )

    Add-Type -AssemblyName System.Net.Http
    $Handler = [System.Net.Http.HttpClientHandler]::new()
    $Handler.AllowAutoRedirect = $false
    $Client = [System.Net.Http.HttpClient]::new($Handler)
    $Client.Timeout = [TimeSpan]::FromSeconds(30)
    $Request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::new($Method),
        $Url
    )
    try {
        if ($PSBoundParameters.ContainsKey('Body')) {
            $Request.Content = [System.Net.Http.StringContent]::new(
                $Body,
                [System.Text.Encoding]::UTF8,
                'application/json'
            )
        }
        foreach ($Name in $Headers.Keys) {
            [void]$Request.Headers.TryAddWithoutValidation($Name, [string]$Headers[$Name])
        }
        $Response = $Client.SendAsync($Request).GetAwaiter().GetResult()
        $ResponseBody = $Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        $ResponseHeaders = @{}
        foreach ($Header in $Response.Headers) {
            $ResponseHeaders[$Header.Key.ToLowerInvariant()] = ($Header.Value -join ', ')
        }
        return [PSCustomObject]@{
            status = [int]$Response.StatusCode
            body = $ResponseBody
            headers = $ResponseHeaders
        }
    }
    finally {
        $Request.Dispose()
        $Client.Dispose()
        $Handler.Dispose()
    }
}

function Assert-Status {
    param(
        [Parameter(Mandatory = $true)][object] $Response,
        [Parameter(Mandatory = $true)][int] $Expected,
        [Parameter(Mandatory = $true)][string] $Label
    )
    if ([int]$Response.status -ne $Expected) {
        throw "$Label returned $($Response.status), expected $Expected."
    }
}

function Assert-PageAudit {
    param(
        [Parameter(Mandatory = $true)][object] $Site,
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)][string] $Canonical,
        [Parameter(Mandatory = $true)][string] $ExpectedText
    )

    $Response = Invoke-Http -Url "$($Site.baseUrl)$Path"
    Assert-Status -Response $Response -Expected 200 -Label "$($Site.siteId) $Path"
    $Html = [string]$Response.body
    if ($Html.IndexOf($ExpectedText, [System.StringComparison]::Ordinal) -lt 0) {
        throw "$($Site.siteId) $Path is missing its expected visible content."
    }
    if ($Html.IndexOf($Site.oppositeName, [System.StringComparison]::Ordinal) -ge 0) {
        throw "$($Site.siteId) $Path leaked opposite-site branding."
    }
    if ($Html.IndexOf($Site.oppositeDomain, [System.StringComparison]::Ordinal) -ge 0) {
        throw "$($Site.siteId) $Path leaked the opposite placeholder domain."
    }
    $EscapedCanonical = [regex]::Escape($Canonical)
    if ($Html -notmatch "<link rel=`"canonical`" href=`"$EscapedCanonical`"") {
        throw "$($Site.siteId) $Path has the wrong canonical."
    }
    if ($Html -notmatch '<meta name="robots" content="noindex, nofollow"') {
        throw "$($Site.siteId) $Path is not noindex,nofollow."
    }

    $JsonLdMatch = [regex]::Match(
        $Html,
        '<script type="application/ld\+json">(.*?)</script>',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    if (-not $JsonLdMatch.Success) {
        throw "$($Site.siteId) $Path has no JSON-LD script."
    }
    $JsonLdSource = [System.Net.WebUtility]::HtmlDecode($JsonLdMatch.Groups[1].Value)
    if (
        $JsonLdSource.IndexOf($Site.domain, [System.StringComparison]::Ordinal) -lt 0 -or
        $JsonLdSource.IndexOf($Site.oppositeDomain, [System.StringComparison]::Ordinal) -ge 0 -or
        $JsonLdSource.IndexOf('localhost:', [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    ) {
        throw "$($Site.siteId) $Path JSON-LD is not current-domain safe."
    }
    $JsonLd = @($JsonLdSource | ConvertFrom-Json)
    $Types = @($JsonLd | ForEach-Object { $_.'@type' })
    if (($Types -join '|') -ne 'Organization|WebSite|BreadcrumbList|WebPage') {
        throw "$($Site.siteId) $Path JSON-LD types are incomplete."
    }
}

function Invoke-HttpAudit {
    $Sites = @(
        [PSCustomObject]@{
            siteId = 'tio2-a'; baseUrl = 'http://localhost:3001'; domain = 'https://tio2-a.example.com'
            oppositeDomain = 'https://tio2-b.example.com'; name = 'TiO2 A'; oppositeName = 'TiO2 B'
        },
        [PSCustomObject]@{
            siteId = 'tio2-b'; baseUrl = 'http://localhost:3002'; domain = 'https://tio2-b.example.com'
            oppositeDomain = 'https://tio2-a.example.com'; name = 'TiO2 B'; oppositeName = 'TiO2 A'
        }
    )

    $AuditSites = [System.Collections.Generic.List[object]]::new()
    foreach ($Site in $Sites) {
        $HomeText = if ($Site.siteId -eq 'tio2-a') { 'Site A Synthetic Test Home' } else { 'Site B Synthetic Test Home' }
        Assert-PageAudit -Site $Site -Path '/' -Canonical $Site.domain -ExpectedText $HomeText
        Assert-PageAudit `
            -Site $Site `
            -Path '/test-content/long-tail-500' `
            -Canonical "$($Site.domain)/test-content/long-tail-500" `
            -ExpectedText "Deterministic local scale fixture 500 for $($Site.siteId)"

        $Robots = Invoke-Http -Url "$($Site.baseUrl)/robots.txt"
        Assert-Status -Response $Robots -Expected 200 -Label "$($Site.siteId) robots"
        foreach ($ExpectedLine in @(
            'User-Agent: *',
            'Disallow: /',
            "Host: $($Site.domain)",
            "Sitemap: $($Site.domain)/sitemap.xml"
        )) {
            if ($Robots.body.IndexOf($ExpectedLine, [System.StringComparison]::Ordinal) -lt 0) {
                throw "$($Site.siteId) robots is missing $ExpectedLine."
            }
        }
        if ($Robots.body.IndexOf($Site.oppositeDomain, [System.StringComparison]::Ordinal) -ge 0) {
            throw "$($Site.siteId) robots leaked the opposite domain."
        }

        $SitemapResponse = Invoke-Http -Url "$($Site.baseUrl)/sitemap.xml"
        Assert-Status -Response $SitemapResponse -Expected 200 -Label "$($Site.siteId) sitemap"
        [xml]$Sitemap = $SitemapResponse.body
        $Urls = @($Sitemap.urlset.url | ForEach-Object { [string]$_.loc })
        $UniqueUrls = @($Urls | Sort-Object -Unique)
        if ($Urls.Count -ne $ExpectedPerSite -or $UniqueUrls.Count -ne $ExpectedPerSite) {
            throw "$($Site.siteId) sitemap has $($Urls.Count) URLs and $($UniqueUrls.Count) unique URLs."
        }
        if (@($Urls | Where-Object { -not $_.StartsWith("$($Site.domain)/", [System.StringComparison]::Ordinal) }).Count -gt 0) {
            throw "$($Site.siteId) sitemap contains a foreign-domain URL."
        }
        if ($Urls -notcontains "$($Site.domain)/test-content/long-tail-500") {
            throw "$($Site.siteId) sitemap is missing long-tail-500."
        }

        $Missing = Invoke-Http -Url "$($Site.baseUrl)/missing-local-http-audit"
        Assert-Status -Response $Missing -Expected 404 -Label "$($Site.siteId) missing page"
        if ($Missing.body.IndexOf($Site.oppositeName, [System.StringComparison]::Ordinal) -ge 0) {
            throw "$($Site.siteId) 404 leaked opposite-site branding."
        }

        $BadPreview = Invoke-Http -Url "$($Site.baseUrl)/api/preview?secret=wrong&siteId=$($Site.siteId)&path=%2Fproducts"
        Assert-Status -Response $BadPreview -Expected 401 -Label "$($Site.siteId) bad preview"
        $OtherSiteId = if ($Site.siteId -eq 'tio2-a') { 'tio2-b' } else { 'tio2-a' }
        $WrongSitePreview = Invoke-Http -Url "$($Site.baseUrl)/api/preview?secret=local-preview-test-secret&siteId=$OtherSiteId&path=%2Fproducts"
        Assert-Status -Response $WrongSitePreview -Expected 400 -Label "$($Site.siteId) cross-site preview"
        $ValidPreview = Invoke-Http -Url "$($Site.baseUrl)/api/preview?secret=local-preview-test-secret&siteId=$($Site.siteId)&path=%2Fproducts"
        Assert-Status -Response $ValidPreview -Expected 307 -Label "$($Site.siteId) valid preview"
        if ($ValidPreview.headers['location'] -ne '/products') {
            throw "$($Site.siteId) preview did not preserve a safe relative redirect."
        }

        $Payload = [ordered]@{
            eventId = [Guid]::NewGuid().ToString('D')
            siteIds = @($Site.siteId)
            contentId = 42
            paths = @('/products')
            entityIds = @()
            modified = [DateTime]::UtcNow.ToString('o')
        }
        $RawBody = $Payload | ConvertTo-Json -Depth 4 -Compress
        $Encoding = [System.Text.Encoding]::UTF8
        $Hmac = [System.Security.Cryptography.HMACSHA256]::new(
            $Encoding.GetBytes('local-revalidation-test-secret')
        )
        try {
            $Signature = ([BitConverter]::ToString($Hmac.ComputeHash($Encoding.GetBytes($RawBody)))).Replace('-', '').ToLowerInvariant()
        }
        finally {
            $Hmac.Dispose()
        }
        $BadRevalidation = Invoke-Http `
            -Url "$($Site.baseUrl)/api/revalidate" `
            -Method POST `
            -Body $RawBody `
            -Headers @{'x-tio2-signature' = ('0' * 64)}
        Assert-Status -Response $BadRevalidation -Expected 401 -Label "$($Site.siteId) bad revalidation"
        $ValidRevalidation = Invoke-Http `
            -Url "$($Site.baseUrl)/api/revalidate" `
            -Method POST `
            -Body $RawBody `
            -Headers @{'x-tio2-signature' = $Signature}
        Assert-Status -Response $ValidRevalidation -Expected 200 -Label "$($Site.siteId) valid revalidation"
        $ValidBody = $ValidRevalidation.body | ConvertFrom-Json
        if (-not $ValidBody.ok -or @($ValidBody.revalidatedPaths) -notcontains '/products') {
            throw "$($Site.siteId) valid revalidation did not invalidate /products."
        }
        $Duplicate = Invoke-Http `
            -Url "$($Site.baseUrl)/api/revalidate" `
            -Method POST `
            -Body $RawBody `
            -Headers @{'x-tio2-signature' = $Signature}
        Assert-Status -Response $Duplicate -Expected 200 -Label "$($Site.siteId) duplicate revalidation"
        $DuplicateBody = $Duplicate.body | ConvertFrom-Json
        if (@($DuplicateBody.revalidatedTags).Count -ne 0 -or @($DuplicateBody.revalidatedPaths).Count -ne 0) {
            throw "$($Site.siteId) duplicate revalidation repeated invalidation."
        }

        $AuditSites.Add([ordered]@{
            siteId = $Site.siteId
            port = [int]([Uri]$Site.baseUrl).Port
            domain = $Site.domain
            publishedUrls = $Urls.Count
        }) | Out-Null
    }

    return @($AuditSites)
}

$ComposeArguments = @('compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile)
$Npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$Npx = (Get-Command npx.cmd -ErrorAction Stop).Source
$PowerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
$Docker = (Get-Command docker.exe -ErrorAction Stop).Source
$TrackedBefore = Get-TrackedSnapshot
$HttpAuditSites = $null

try {
    Invoke-Gate -Name 'compose' -Action {
        Invoke-NativeLogged -FilePath $Docker -Arguments @($ComposeArguments + @('config', '--quiet')) -LogName 'compose-config'
        Invoke-NativeLogged -FilePath $Docker -Arguments @($ComposeArguments + @('ps', '--format', 'json')) -LogName 'compose-status'
        $Services = @(
            Get-Content -LiteralPath (Join-Path $LogDirectory 'compose-status.log') |
                Where-Object { $_.Trim() } |
                ForEach-Object { $_ | ConvertFrom-Json }
        )
        $Database = @($Services | Where-Object { $_.Service -eq 'db' }) | Select-Object -First 1
        $WordPress = @($Services | Where-Object { $_.Service -eq 'wordpress' }) | Select-Object -First 1
        if (-not $Database -or $Database.State -ne 'running' -or $Database.Health -ne 'healthy') {
            throw 'Compose database service is not running and healthy.'
        }
        if (-not $WordPress -or $WordPress.State -ne 'running') {
            throw 'Compose WordPress service is not running.'
        }
        $WordPressHealth = Invoke-Http -Url 'http://localhost:8080/wp-json/'
        Assert-Status -Response $WordPressHealth -Expected 200 -Label 'WordPress REST health'
    }

    Invoke-Gate -Name 'wordpress-smoke' -Action {
        Invoke-NativeLogged `
            -FilePath $Docker `
            -Arguments @($ComposeArguments + @(
                'run', '--rm', '--no-TTY', 'wpcli',
                'wp', 'eval-file', '/workspace/wordpress/tests/smoke.php'
            )) `
            -LogName 'wordpress-smoke'
    }

    Invoke-Gate -Name 'seed-audit' -Action {
        Invoke-NativeLogged `
            -FilePath $PowerShell `
            -Arguments @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'audit-seed.ps1'), '-ExpectedPerSite', "$ExpectedPerSite") `
            -LogName 'seed-audit'
    }

    Invoke-Gate -Name 'lint' -Action {
        Invoke-NativeLogged -FilePath $Npm -Arguments @('run', 'lint') -LogName 'lint'
    }

    Invoke-Gate -Name 'typecheck' -Action {
        Invoke-NativeLogged -FilePath $Npm -Arguments @('run', 'typecheck') -LogName 'typecheck'
    }

    Invoke-Gate -Name 'codegen' -Action {
        $GeneratedPath = Join-Path $RepositoryRoot 'lib/wordpress/generated.ts'
        $BeforeHash = Get-Sha256 -Path $GeneratedPath
        Invoke-NativeLogged -FilePath $Npm -Arguments @('run', 'codegen') -LogName 'codegen'
        $AfterHash = Get-Sha256 -Path $GeneratedPath
        if ($BeforeHash -ne $AfterHash) {
            throw 'GraphQL code generation changed the committed generated output.'
        }
    }

    Invoke-Gate -Name 'vitest' -Action {
        Invoke-NativeLogged -FilePath $Npm -Arguments @('test') -LogName 'vitest'
    }

    Invoke-Gate -Name 'vitest-live-seed' -Action {
        Invoke-WithEnvironment -Values @{WORDPRESS_SEED_RUNTIME = '1'} -Action {
            Invoke-NativeLogged `
                -FilePath $Npx `
                -Arguments @('vitest', 'run', 'tests/integration/wordpress/seed-runtime.test.ts') `
                -LogName 'vitest-live-seed'
        }
        Invoke-NativeLogged `
            -FilePath $PowerShell `
            -Arguments @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'audit-seed.ps1'), '-ExpectedPerSite', "$ExpectedPerSite") `
            -LogName 'seed-audit-after-live'
    }

    foreach ($Site in @(
        [PSCustomObject]@{id = 'tio2-a'; dist = '.next-tio2-a'},
        [PSCustomObject]@{id = 'tio2-b'; dist = '.next-tio2-b'}
    )) {
        Invoke-Gate -Name "build-$($Site.id)" -Action {
            Invoke-WithEnvironment -Values @{
                SITE_ID = $Site.id
                NEXT_DIST_DIR = $Site.dist
                WORDPRESS_GRAPHQL_URL = 'http://localhost:8080/graphql'
                PREVIEW_SECRET = 'local-preview-test-secret'
                REVALIDATION_SECRET = 'local-revalidation-test-secret'
                VERCEL_ENV = $null
                SEO_ALLOW_INDEXING_LOCAL_TEST = $null
            } -Action {
                Invoke-NativeLogged -FilePath $Npm -Arguments @('run', 'build') -LogName "build-$($Site.id)"
            }
        }
    }

    Invoke-Gate -Name 'launch' -Action {
        Invoke-ControllerStart
        if ($script:LaunchState.mode -ne 'running' -or @($script:LaunchState.sites).Count -ne 2) {
            throw 'The local site controller did not report both sites running.'
        }
    }

    Invoke-Gate -Name 'playwright' -Action {
        Invoke-NativeLogged `
            -FilePath $Npm `
            -Arguments @('run', 'test:e2e', '--', 'tests/e2e/two-sites.spec.ts') `
            -LogName 'playwright'
    }

    Invoke-Gate -Name 'http-audit' -Action {
        $script:HttpAuditSites = @(Invoke-HttpAudit)
        if ($script:HttpAuditSites.Count -ne 2) {
            throw 'HTTP audit did not return both site summaries.'
        }
    }

    Invoke-Gate -Name 'tracked-worktree' -Action {
        $TrackedAfter = Get-TrackedSnapshot
        if ($TrackedAfter -ne $TrackedBefore) {
            throw 'Verification changed tracked worktree files.'
        }
    }

    $VitestCount = Get-PassedCount -LogName 'vitest' -Pattern 'Tests\s+(\d+)\s+passed'
    $LiveVitestCount = Get-PassedCount -LogName 'vitest-live-seed' -Pattern 'Tests\s+(\d+)\s+passed'
    $PlaywrightCount = Get-PassedCount -LogName 'playwright' -Pattern '(\d+)\s+passed'
    $SuccessSummary = [ordered]@{
        schemaVersion = 1
        status = 'passed'
        gates = @($GateResults)
        sites = @($HttpAuditSites)
        ports = @(3001, 3002)
        counts = [ordered]@{
            sites = 2
            publishedUrlsPerSite = $ExpectedPerSite
            sitemapUrls = $ExpectedPerSite * 2
            vitest = $VitestCount
            vitestLive = $LiveVitestCount
            playwright = $PlaywrightCount
            builds = 2
            leaks = 0
        }
        trackedWorktreeUnchanged = $true
        processCleanup = 'passed'
    }
}
catch {
    $PendingError = $_
}
finally {
    if ($SitesStartedByGate) {
        try {
            Invoke-NativeLogged `
                -FilePath $PowerShell `
                -Arguments @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Controller, '-Stop') `
                -LogName 'cleanup'
            foreach ($Port in @(3001, 3002)) {
                $Connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
                if ($Connection) {
                    throw "Controller-owned local site port $Port is still listening after cleanup."
                }
            }
        }
        catch {
            if ($null -eq $PendingError) {
                $PendingError = $_
            }
            else {
                Write-GateMessage "Cleanup also failed: $($_.Exception.Message)"
            }
        }
    }
}

if ($null -ne $PendingError) {
    throw $PendingError
}

$SuccessSummary | ConvertTo-Json -Depth 8 -Compress
