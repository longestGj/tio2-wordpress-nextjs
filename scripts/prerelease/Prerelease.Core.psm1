$script:PrereleaseComposeProject = 'd16-tio2-my-prerelease'
$script:PrereleaseSiteId = 'tio2-my'

function Get-PrereleasePlan {
    [CmdletBinding()]
    param()

    [pscustomobject][ordered]@{
        schemaVersion  = 1
        composeProject = $script:PrereleaseComposeProject
        siteId         = $script:PrereleaseSiteId
        website        = 'http://127.0.0.1:3100'
        wordpress      = 'http://127.0.0.1:8180'
        acceptedBranch = 'main'
        actions        = @('Start', 'Status', 'Stop', 'ResetData', 'Test', 'TestLiveForms')
    }
}

function Invoke-PrereleaseGit {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string[]] $Arguments
    )

    $output = @(& git -C $RepositoryRoot @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git -C $RepositoryRoot $($Arguments -join ' ')`n$($output -join "`n")"
    }
    return $output
}

function Get-PrereleaseGitIdentity {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot)

    $resolvedRoot = (Resolve-Path -LiteralPath $RepositoryRoot -ErrorAction Stop).Path
    $branch = (Invoke-PrereleaseGit -RepositoryRoot $resolvedRoot -Arguments @('branch', '--show-current') | Select-Object -First 1).Trim()
    $commit = (Invoke-PrereleaseGit -RepositoryRoot $resolvedRoot -Arguments @('rev-parse', 'HEAD') | Select-Object -First 1).Trim()
    $entries = @(Invoke-PrereleaseGit -RepositoryRoot $resolvedRoot -Arguments @('status', '--porcelain=v1', '--untracked-files=all'))

    [pscustomobject][ordered]@{
        branch      = $branch
        commit      = $commit
        shortCommit = $commit.Substring(0, [Math]::Min(12, $commit.Length))
        entries     = @($entries | Where-Object { $_ -ne '' })
    }
}

function Assert-PrereleaseSource {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [object] $GitIdentity)

    if ($GitIdentity.branch -ne 'main') {
        throw "Prerelease Start requires branch main; actual branch is $($GitIdentity.branch)."
    }
    if (@($GitIdentity.entries).Count -ne 0) {
        throw "Prerelease Start requires a clean worktree. Changes: $(@($GitIdentity.entries) -join '; ')"
    }
    return $GitIdentity
}

function Enter-PrereleaseLock {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $StateRoot)

    [System.IO.Directory]::CreateDirectory($StateRoot) | Out-Null
    $lockPath = [System.IO.Path]::Combine($StateRoot, 'operation.lock')
    try {
        $handle = [System.IO.File]::Open(
            $lockPath,
            [System.IO.FileMode]::OpenOrCreate,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None
        )
        $handle.SetLength(0)
        $writer = [System.IO.StreamWriter]::new($handle, [System.Text.UTF8Encoding]::new($false), 1024, $true)
        $writer.Write((@{
                    pid       = $PID
                    startedAt = [DateTimeOffset]::Now.ToString('o')
                } | ConvertTo-Json -Compress))
        $writer.Flush()
        $writer.Dispose()
        $handle.Flush()
        return [pscustomobject]@{ Handle = $handle; Path = $lockPath }
    }
    catch {
        if ($null -ne $handle) { $handle.Dispose() }
        throw "Another prerelease operation is already running or the lock cannot be acquired: $lockPath"
    }
}

function Exit-PrereleaseLock {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [object] $Lock)

    if ($null -ne $Lock.Handle) { $Lock.Handle.Dispose() }
}

function Assert-PrereleasePorts {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [int[]] $Ports)

    foreach ($port in $Ports) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
        if ($listener) { throw "Prerelease port $port is already in use." }
    }
    return $Ports
}

function Invoke-PrereleaseDocker {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string[]] $Arguments,
        [string] $DockerExecutable = 'docker'
    )

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $rawOutput = @(& $DockerExecutable @Arguments 2>&1)
        $dockerExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    $output = @($rawOutput | ForEach-Object { [string] $_ })
    if ($dockerExitCode -ne 0) {
        throw "Docker command failed: $DockerExecutable $($Arguments -join ' ')`n$($output -join "`n")"
    }
    return $output
}

function Get-PrereleaseComposeArguments {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string] $EnvironmentFile
    )

    @(
        'compose',
        '--project-name', $script:PrereleaseComposeProject,
        '--env-file', $EnvironmentFile,
        '-f', (Join-Path $RepositoryRoot 'ops/prerelease/docker-compose.yml')
    )
}

function Assert-PrereleaseOwnedVolumes {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string[]] $Volumes)

    foreach ($volume in $Volumes) {
        if ($volume -notmatch '^d16-tio2-my-prerelease_[A-Za-z0-9_.-]+$') {
            throw "Refusing to operate on volume outside the prerelease Compose project: $volume"
        }
        Write-Output $volume
    }
}

function Test-PrereleaseSeedManifest {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $ManifestPath,
        [Parameter(Mandatory)] [string] $SourceRoot
    )

    $manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
    if ($manifest.schemaVersion -ne 1 -or $manifest.siteScope -ne 'tio2-my') {
        throw 'Invalid prerelease seed manifest.'
    }
    $verified = foreach ($seed in @($manifest.seeds)) {
        $relativePath = [string] $seed.path
        $expected = ([string] $seed.sha256).ToLowerInvariant()
        $absolutePath = Join-Path $SourceRoot ($relativePath -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
            throw "Seed file is missing: $relativePath"
        }
        $stream = [System.IO.File]::OpenRead($absolutePath)
        try {
            $sha256 = [System.Security.Cryptography.SHA256]::Create()
            try {
                $actual = ([System.BitConverter]::ToString($sha256.ComputeHash($stream)) -replace '-', '').ToLowerInvariant()
            }
            finally { $sha256.Dispose() }
        }
        finally { $stream.Dispose() }
        if ($expected -notmatch '^[a-f0-9]{64}$' -or $actual -ne $expected) {
            throw "Seed hash mismatch: $relativePath; expected $expected; actual $actual"
        }
        [pscustomobject]@{ path = $relativePath; sha256 = $actual }
    }
    return @($verified)
}

function Get-PrereleaseSha256 {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $Path)

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
            return ([System.BitConverter]::ToString($sha256.ComputeHash($stream)) -replace '-', '').ToLowerInvariant()
        }
        finally { $sha256.Dispose() }
    }
    finally { $stream.Dispose() }
}

function New-PrereleaseFrozenSource {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [ValidatePattern('^[a-fA-F0-9]{40}$')] [string] $Commit,
        [Parameter(Mandatory)] [string] $RunsRoot,
        [DateTimeOffset] $Now = [DateTimeOffset]::UtcNow
    )

    $runId = $Now.ToUniversalTime().ToString('yyyyMMddTHHmmssZ') + '-' + $Commit.Substring(0, 12).ToLowerInvariant()
    $runRoot = Join-Path $RunsRoot $runId
    $sourcePath = Join-Path $runRoot 'source'
    $archivePath = Join-Path $runRoot 'source.tar'
    if (Test-Path -LiteralPath $runRoot) { throw "Prerelease run already exists: $runId" }
    [System.IO.Directory]::CreateDirectory($sourcePath) | Out-Null

    $archiveOutput = @(& git -C $RepositoryRoot archive --format=tar --output=$archivePath $Commit 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Failed to archive prerelease commit: $($archiveOutput -join "`n")" }
    $archiveSha256 = Get-PrereleaseSha256 -Path $archivePath
    $extractOutput = @(& tar -xf $archivePath -C $sourcePath 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Failed to extract prerelease source archive: $($extractOutput -join "`n")" }

    [pscustomobject][ordered]@{
        runId         = $runId
        runRoot       = $runRoot
        sourcePath    = $sourcePath
        archivePath   = $archivePath
        archiveSha256 = $archiveSha256
        commit        = $Commit.ToLowerInvariant()
    }
}

function Get-PrereleaseRuntimeStatus {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object] $RunManifest,
        [Parameter(Mandatory)] [string] $CurrentMainCommit,
        [Parameter(Mandatory)] [object] $LiveIdentity
    )

    $reasons = [System.Collections.Generic.List[string]]::new()
    if ($RunManifest.state -ne 'HEALTHY') { $reasons.Add('recorded_state') }
    if ($LiveIdentity.containersHealthy -ne $true) { $reasons.Add('container_health') }
    if ($LiveIdentity.cmsIdentityRefreshed -ne $true) { $reasons.Add('cms_identity_refresh') }
    if ($LiveIdentity.httpMarkersValid -ne $true) { $reasons.Add('http_markers') }
    if ($LiveIdentity.reachable -ne $true) { $reasons.Add('runtime_unreachable') }
    if ($LiveIdentity.buildId -ne $RunManifest.buildId) { $reasons.Add('build_id_mismatch') }
    if ($LiveIdentity.siteId -ne $RunManifest.siteId) { $reasons.Add('site_id_mismatch') }
    if ($LiveIdentity.cmsIdentitySha256 -ne $RunManifest.cmsIdentitySha256) { $reasons.Add('cms_identity_mismatch') }
    if ($LiveIdentity.sourceCommit -ne $RunManifest.commit) { $reasons.Add('source_commit_mismatch') }
    if ($LiveIdentity.runId -ne $RunManifest.runId) { $reasons.Add('run_id_mismatch') }

    $state = if ($reasons.Count -gt 0) {
        'UNHEALTHY'
    }
    elseif ($CurrentMainCommit -ne $RunManifest.commit) {
        'STALE_MAIN'
    }
    else {
        'HEALTHY'
    }

    [pscustomobject][ordered]@{
        state            = $state
        runtimePreserved = $true
        runId            = $RunManifest.runId
        commit           = $RunManifest.commit
        buildId          = $RunManifest.buildId
        siteId           = $RunManifest.siteId
        reasons          = @($reasons)
    }
}

function Test-PrereleaseContainerHealth {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [object[]] $Records)

    $reasons = [System.Collections.Generic.List[string]]::new()
    foreach ($service in @('db', 'wordpress', 'web')) {
        $record = @($Records | Where-Object { $_.Service -eq $service }) | Select-Object -First 1
        if ($null -eq $record) {
            $reasons.Add("${service}_missing")
            continue
        }
        if ($record.State -ne 'running') { $reasons.Add("${service}_not_running") }
        if ($record.Health -ne 'healthy') { $reasons.Add("${service}_not_healthy") }
    }

    [pscustomobject][ordered]@{
        healthy = $reasons.Count -eq 0
        reasons = @($reasons)
    }
}

function Test-PrereleaseHtmlIdentity {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $Html,
        [string] $ExpectedPageId = ''
    )

    $reasons = [System.Collections.Generic.List[string]]::new()
    if ($ExpectedPageId -eq 'CONV-RFQ') {
        # Public RFQ projection deliberately omits internal scope/page attributes.
        # Runtime site/commit/Build identity is checked separately by the caller.
        $canonical = $null
        foreach ($match in [regex]::Matches($Html, '(?is)<link\b[^>]*>')) {
            $tag = $match.Value
            if ($tag -match '(?i)rel\s*=\s*["'']canonical["'']' -and $tag -match '(?i)href\s*=\s*["''](?<href>[^"'']*)["'']') { $canonical = $Matches.href }
        }
        if ($canonical -ne 'https://tio2malaysia.com/request-a-quote/') { $reasons.Add('rfq_canonical') }
        if ($Html -notmatch '(?i)<h1\b[^>]*\bid\s*=\s*["'']rfq-h1["'']') { $reasons.Add('rfq_heading') }
        if ($Html -notmatch '(?i)<input\b[^>]*\bid\s*=\s*["'']rfq-business_email["'']') { $reasons.Add('rfq_form') }
        if ($Html -match '(?i)data-site-scope\s*=\s*["''](?!tio2-my["''])') { $reasons.Add('foreign_site_scope') }
    }
    elseif ($Html -notmatch '(?i)data-site-scope\s*=\s*["'']tio2-my["'']') {
        $reasons.Add('site_scope_marker')
    }
    if ($ExpectedPageId -ne 'CONV-RFQ' -and -not [string]::IsNullOrWhiteSpace($ExpectedPageId)) {
        $escapedPageId = [regex]::Escape($ExpectedPageId)
        $pagePattern = '(?i)data-page-id\s*=\s*["'']' + $escapedPageId + '["'']'
        if ($Html -notmatch $pagePattern) {
            $reasons.Add('page_id_marker')
        }
    }
    $robotsContent = $null
    foreach ($match in [regex]::Matches($Html, '(?is)<meta\b[^>]*>')) {
        $tag = $match.Value
        if ($tag -match '(?i)name\s*=\s*["'']robots["'']' -and $tag -match '(?i)content\s*=\s*["''](?<content>[^"'']*)["'']') {
            $robotsContent = $Matches.content
            break
        }
    }
    if ($null -eq $robotsContent -or $robotsContent -notmatch '(?i)(?:^|[,\s])noindex(?:$|[,\s])') {
        $reasons.Add('robots_noindex')
    }
    if ($null -eq $robotsContent -or $robotsContent -notmatch '(?i)(?:^|[,\s])nofollow(?:$|[,\s])') {
        $reasons.Add('robots_nofollow')
    }

    [pscustomobject][ordered]@{
        valid   = $reasons.Count -eq 0
        reasons = @($reasons)
    }
}

function Write-PrereleaseJsonFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object] $Value,
        [Parameter(Mandatory)] [string] $Path
    )

    $directory = Split-Path -Parent $Path
    [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    $temporary = "$Path.tmp-$PID"
    [System.IO.File]::WriteAllText($temporary, (($Value | ConvertTo-Json -Depth 20) + "`n"), [System.Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Get-PrereleaseLiveIdentity {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object] $RunManifest,
        [Parameter(Mandatory)] [string] $RunRoot,
        [Parameter(Mandatory)] [string[]] $ComposeArguments,
        [string] $DockerExecutable = 'docker'
    )

    $cmsPath = Join-Path $RunRoot 'live-cms-identity.json'
    $containerState = [pscustomobject]@{ healthy = $false; reasons = @('compose_ps_failed') }
    $cmsRefreshed = $false
    try {
        $psOutput = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($ComposeArguments + @('ps', '--format', 'json', 'db', 'wordpress', 'web')))
        $joined = ($psOutput -join "`n").Trim()
        $records = if ($joined.StartsWith('[')) {
            @($joined | ConvertFrom-Json)
        }
        else {
            @($psOutput | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_ | ConvertFrom-Json })
        }
        $containerState = Test-PrereleaseContainerHealth -Records $records
        if ($containerState.healthy) {
            $liveCmsCommand = 'wp eval-file /workspace/wordpress/bootstrap/validate-prerelease-site.php > /run-state/live-site-validation.json && SITE_VALIDATION_PATH=/run-state/live-site-validation.json CMS_IDENTITY_OUTPUT_PATH=/run-state/live-cms-identity.json bash /workspace/ops/prerelease/collect-cms-identity.sh'
            Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($ComposeArguments + @('--profile', 'tools', 'run', '--rm', '--no-deps', 'wpcli', 'bash', '-lc', $liveCmsCommand)) | Out-Null
            $cmsRefreshed = Test-Path -LiteralPath $cmsPath -PathType Leaf
        }
    }
    catch {
        $containerState = [pscustomobject]@{ healthy = $false; reasons = @('live_cms_check_failed') }
    }
    $cmsSha = if ($cmsRefreshed) { Get-PrereleaseSha256 -Path $cmsPath } else { $null }
    try {
        $response = Invoke-RestMethod -Uri 'http://127.0.0.1:3100/api/prerelease-identity' -Method Get -TimeoutSec 10
        $httpMarkersValid = $false
        try {
            Test-PrereleaseHttpRound -ExpectedRunId $RunManifest.runId -ExpectedCommit $RunManifest.commit -ExpectedBuildId $RunManifest.buildId | Out-Null
            $httpMarkersValid = $true
        }
        catch { $httpMarkersValid = $false }
        [pscustomobject]@{
            reachable         = $true
            containersHealthy = $containerState.healthy
            containerReasons  = @($containerState.reasons)
            cmsIdentityRefreshed = $cmsRefreshed
            httpMarkersValid  = $httpMarkersValid
            buildId           = $response.buildId
            siteId            = $response.siteId
            runId             = $response.runId
            sourceCommit      = $response.sourceCommit
            cmsIdentitySha256 = $cmsSha
        }
    }
    catch {
        [pscustomobject]@{
            reachable         = $false
            containersHealthy = $containerState.healthy
            containerReasons  = @($containerState.reasons)
            cmsIdentityRefreshed = $cmsRefreshed
            httpMarkersValid  = $false
            buildId           = $null
            siteId            = $null
            runId             = $null
            sourceCommit      = $null
            cmsIdentitySha256 = $cmsSha
        }
    }
}

function Invoke-PrereleaseGet {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $Uri)

    $currentUri = [Uri] $Uri
    for ($redirectCount = 0; $redirectCount -le 5; $redirectCount++) {
        try {
            return Invoke-WebRequest -Uri $currentUri.AbsoluteUri -Method Get -UseBasicParsing -TimeoutSec 30
        }
        catch {
            $webResponse = $_.Exception.Response
            if ($null -eq $webResponse) { throw }
            $statusCode = [int] $webResponse.StatusCode
            $location = [string] $webResponse.Headers['Location']
            if ($statusCode -notin @(301, 302, 303, 307, 308) -or [string]::IsNullOrWhiteSpace($location)) { throw }
            if ($redirectCount -ge 5) { throw "Too many redirects for $Uri" }
            $nextUri = [Uri]::new($currentUri, $location)
            if ($nextUri.Scheme -ne $currentUri.Scheme -or $nextUri.Authority -ne $currentUri.Authority) {
                throw "Prerelease GET redirect left the expected origin: $($nextUri.AbsoluteUri)"
            }
            $currentUri = $nextUri
        }
    }
    throw "Prerelease GET redirect chain did not resolve: $Uri"
}

function Test-PrereleaseHttpRound {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $ExpectedRunId,
        [Parameter(Mandatory)] [string] $ExpectedCommit,
        [Parameter(Mandatory)] [string] $ExpectedBuildId
    )

    $targets = @(
        [pscustomobject]@{ url = 'http://127.0.0.1:3100/'; pageId = '' },
        [pscustomobject]@{ url = 'http://127.0.0.1:3100/request-a-quote/'; pageId = 'CONV-RFQ' },
        [pscustomobject]@{ url = 'http://127.0.0.1:3100/request-sample/'; pageId = 'CONV-SAMPLE' },
        [pscustomobject]@{ url = 'http://127.0.0.1:3100/request-documents/'; pageId = 'CONV-DOC' },
        [pscustomobject]@{ url = 'http://127.0.0.1:3100/privacy-policy/'; pageId = 'LEGAL-PRIV-EN' }
    )
    $results = foreach ($target in $targets) {
        try {
            $response = Invoke-PrereleaseGet -Uri $target.url
            if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) { throw "HTTP $($response.StatusCode)" }
            $markers = Test-PrereleaseHtmlIdentity -Html ([string] $response.Content) -ExpectedPageId $target.pageId
            if (-not $markers.valid) { throw "identity markers: $($markers.reasons -join ', ')" }
            [pscustomobject]@{ url = $target.url; status = [int] $response.StatusCode; markers = 'valid' }
        }
        catch { throw "Prerelease GET check failed for $($target.url): $($_.Exception.Message)" }
    }
    $graphqlUrl = 'http://127.0.0.1:8180/graphql'
    try {
        $graphql = Invoke-WebRequest -Uri $graphqlUrl -Method Get -UseBasicParsing -TimeoutSec 30
        if ($graphql.StatusCode -lt 200 -or $graphql.StatusCode -ge 400) { throw "HTTP $($graphql.StatusCode)" }
        $results += [pscustomobject]@{ url = $graphqlUrl; status = [int] $graphql.StatusCode }
    }
    catch { throw "Prerelease GET check failed for ${graphqlUrl}: $($_.Exception.Message)" }

    $identityUrl = 'http://127.0.0.1:3100/api/prerelease-identity'
    try {
        $identity = Invoke-RestMethod -Uri $identityUrl -Method Get -TimeoutSec 30
        if ($identity.siteId -ne 'tio2-my' -or $identity.runId -ne $ExpectedRunId -or $identity.sourceCommit -ne $ExpectedCommit -or $identity.buildId -ne $ExpectedBuildId) {
            throw 'runtime identity mismatch'
        }
        $results += [pscustomobject]@{ url = $identityUrl; status = 200; markers = 'valid' }
    }
    catch { throw "Prerelease GET check failed for ${identityUrl}: $($_.Exception.Message)" }
    return @($results)
}

function Get-PrereleaseTestActionPlan {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [ValidateSet('Test', 'TestLiveForms')] [string] $Action,
        [Parameter(Mandatory)] [bool] $LiveFormsEnabled
    )

    if ($Action -eq 'TestLiveForms') {
        if (-not $LiveFormsEnabled) {
            throw 'TestLiveForms requires PRERELEASE_LIVE_FORMS_ENABLED=true in .env.prerelease.local.'
        }
        return [pscustomobject][ordered]@{
            action                = 'TestLiveForms'
            specs                 = @('tests/e2e/prerelease-live-forms.spec.ts')
            allowNonGet           = $true
            expectedWorkflowCount = 3
        }
    }
    [pscustomobject][ordered]@{
        action                    = 'Test'
        specs                     = @('tests/e2e/prerelease-smoke.spec.ts', 'tests/e2e/prerelease-public-paths.spec.ts')
        allowNonGet               = $false
        expectedExternalPostCount = 0
    }
}

function Complete-PrereleaseEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $EvidenceRoot,
        [Parameter(Mandatory)] [object] $Manifest,
        [Parameter(Mandatory)] [string] $CommandUuid,
        [Parameter(Mandatory)] [ValidateSet('Test', 'TestLiveForms')] [string] $Action,
        [Parameter(Mandatory)] [int] $TestExit
    )
    if ($Manifest.commit -notmatch '^[a-f0-9]{40}$' -or $Manifest.cmsIdentitySha256 -notmatch '^[a-fA-F0-9]{64}$' -or $Manifest.siteId -ne 'tio2-my' -or [string]::IsNullOrWhiteSpace($Manifest.runId) -or [string]::IsNullOrWhiteSpace($Manifest.buildId)) { throw 'Evidence requires complete candidate runtime identity.' }
    $expectedSuites = if ($Action -eq 'Test') { @('smoke', 'public-paths') } else { @('live-forms') }
    $expectedCounts = @{'smoke'=6;'public-paths'=4;'live-forms'=3}
    $checks = @(); $attempts = @(); $seenSuites = @(); $invalid = $false; $posts = 0
    foreach ($file in @(Get-ChildItem -LiteralPath $EvidenceRoot -Filter '*.json' -File | Sort-Object Name)) {
        if ($file.Name -notmatch '^(smoke|public-paths|live-forms|provider)-') { continue }
        try {
            $fragment = Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
            if ($fragment.commandUuid -ne $CommandUuid) { throw 'Foreign fragment.' }
            if ($file.Name -like 'provider-*') {
                $attempt = $fragment.attempt
                Assert-PrereleaseFormAttempt -Attempt $attempt | Out-Null
                $attempts += $attempt
                continue
            }
            if ($fragment.suite -notin $expectedSuites) { throw 'Unexpected suite.' }
            if (@($fragment.checks).Count -ne 1 -or $fragment.externalPostCount -isnot [int] -or $fragment.externalPostCount -lt 0) { throw 'Invalid fragment counts.' }
            $seenSuites += $fragment.suite
            $posts += [int]$fragment.externalPostCount
            foreach ($check in @($fragment.checks)) {
                if ($check.check -notmatch '^[a-zA-Z0-9_ .:/-]{1,200}$' -or $check.status -notin @('PASSED', 'FAILED', 'NOT_TESTED')) { throw 'Invalid check.' }
                $checks += [ordered]@{ check = [string]$check.check; status = [string]$check.status }
            }
        } catch { $invalid = $true }
    }
    foreach ($suite in $expectedSuites) { if (@($seenSuites | Where-Object { $_ -eq $suite }).Count -ne $expectedCounts[$suite]) { $invalid = $true } }
    if (@($checks.check | Select-Object -Unique).Count -ne $checks.Count) { $invalid = $true }
    if ($checks.Count -eq 0 -or @($checks | Where-Object { $_.status -ne 'PASSED' }).Count -gt 0) { $invalid = $true }
    if ($Action -eq 'Test' -and ($posts -ne 0 -or $attempts.Count -ne 0)) { $invalid = $true }
    if ($Action -eq 'TestLiveForms') {
        if ($attempts.Count -ne 3 -or @($attempts.requestToken | Select-Object -Unique).Count -ne 3) { $invalid = $true }
        foreach ($workflow in @('rfq', 'sample', 'documents')) {
            $positive = @($attempts | Where-Object { $_.workflow -eq $workflow -and $_.httpStatus -eq 200 -and $_.providerCategory -eq 'accepted' -and $_.thankYouRequest -eq @{rfq='quote';sample='sample';documents='documents'}[$workflow] })
            if ($positive.Count -ne 1) { $invalid = $true }
        }
    }
    $result = [ordered]@{
        schemaVersion = 2; action = $Action; commandUuid = $CommandUuid
        candidateCommit = $Manifest.commit; runId = $Manifest.runId; buildId = $Manifest.buildId
        cmsIdentitySha256 = $Manifest.cmsIdentitySha256; siteId = $Manifest.siteId
        checkedAt = [DateTimeOffset]::UtcNow.ToString('o'); testExit = $TestExit
        state = $(if ($TestExit -eq 0 -and -not $invalid) { 'PASSED' } else { 'FAILED' })
        evidenceValid = -not $invalid
        requiredWidths = @(1440, 768, 390)
        requiredChecks = @('chromium', 'axe', 'keyboard', 'visible_focus', 'public_paths', 'internal_links_58', 'no_horizontal_overflow', 'back_return_state', 'five_application_provisional_metadata')
        inventory = [ordered]@{registeredObjects=58;eligibleRoutes=42;cmsRoutes=41;nativeRoutes=1;homeActions=6;productGrades=14;productProcesses=2;productSupport=3;applicationChildren=5;applicationGradeOccurrences=30;applicationSupport=3;resourceItems=8;documentGuides=3}
        removedChecks = @(@('native_browser_200_percent', 'physical_or_touch_device', 'screen_reader_or_at', 'forced_colors') | ForEach-Object { [ordered]@{check=$_;status='NOT_TESTED';reason='NO_LONGER_REQUIRED_BY_USER_DECISION'} })
        checks = @($checks); externalPostCount = $posts; formAttempts = @($attempts)
        inboxStatus = 'PENDING_MANUAL_CONFIRMATION'
    }
    Write-PrereleaseJsonFile -Value $result -Path (Join-Path $EvidenceRoot 'result.json')
    [pscustomobject]$result
}

function Assert-PrereleaseFormAttempt {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [object] $Attempt)
    $keys = @($Attempt.PSObject.Properties.Name | Sort-Object)
    $allowed = @('workflow','pageId','requestToken','httpStatus','providerCategory','thankYouRequest','timestamp') | Sort-Object
    if (@(Compare-Object $keys $allowed).Count -ne 0) { throw 'Unexpected attempt fields.' }
    if (($Attempt | ConvertTo-Json -Compress) -match '@|access_key|company|message|payload|receiver') { throw 'Unsafe attempt.' }
    if ($Attempt.workflow -notin @('rfq','sample','documents') -or $Attempt.pageId -ne @{rfq='CONV-RFQ';sample='CONV-SAMPLE';documents='CONV-DOC'}[$Attempt.workflow]) { throw 'Invalid workflow identity.' }
    if ($Attempt.requestToken -notmatch '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$') { throw 'Invalid request token.' }
    if ($null -ne $Attempt.httpStatus -and ($Attempt.httpStatus -isnot [int] -or $Attempt.httpStatus -lt 100 -or $Attempt.httpStatus -gt 599)) { throw 'Invalid HTTP status.' }
    if ($Attempt.providerCategory -notin @('accepted','rejected','rate_limited','invalid_request','network','timeout','aborted','unexpected','pending')) { throw 'Invalid provider category.' }
    if ($null -ne $Attempt.thankYouRequest -and $Attempt.thankYouRequest -ne @{rfq='quote';sample='sample';documents='documents'}[$Attempt.workflow]) { throw 'Invalid Thank You request.' }
    if ($Attempt.timestamp -notmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$') { throw 'Invalid attempt timestamp.' }
}

function Assert-PrereleaseEnvironmentFile {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw 'The prerelease environment file is missing.'
    }
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line) -or $line -notmatch '=') { continue }
        $name, $value = $line -split '=', 2
        $values[$name.Trim()] = $value.Trim().Trim("'`"")
    }
    $required = @(
        'WORDPRESS_DB_NAME', 'WORDPRESS_DB_USER', 'WORDPRESS_DB_PASSWORD', 'WORDPRESS_DB_ROOT_PASSWORD',
        'WORDPRESS_ADMIN_USER', 'WORDPRESS_ADMIN_PASSWORD', 'WORDPRESS_ADMIN_EMAIL',
        'NEXTJS_REVALIDATION_SECRET_TIO2_MY', 'NEXTJS_PREVIEW_SECRET_TIO2_MY',
        'WORDPRESS_EDITORIAL_API_TOKEN',
        'NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', 'PRERELEASE_LIVE_FORMS_ENABLED'
    )
    foreach ($name in $required) {
        $value = [string] $values[$name]
        if ([string]::IsNullOrWhiteSpace($value) -or $value -match '^replace-with-') {
            throw "Prerelease configuration is missing or still uses a placeholder: $name"
        }
    }
    if ($values.PRERELEASE_LIVE_FORMS_ENABLED -notin @('true', 'false')) {
        throw 'PRERELEASE_LIVE_FORMS_ENABLED must be true or false.'
    }
    [pscustomobject]@{
        configured      = $true
        liveFormsEnabled = $values.PRERELEASE_LIVE_FORMS_ENABLED -eq 'true'
    }
}

Export-ModuleMember -Function @(
    'Get-PrereleasePlan',
    'Get-PrereleaseGitIdentity',
    'Assert-PrereleaseSource',
    'Enter-PrereleaseLock',
    'Exit-PrereleaseLock',
    'Assert-PrereleasePorts',
    'Invoke-PrereleaseDocker',
    'Get-PrereleaseComposeArguments',
    'Assert-PrereleaseOwnedVolumes',
    'Test-PrereleaseSeedManifest',
    'Get-PrereleaseSha256',
    'New-PrereleaseFrozenSource',
    'Get-PrereleaseRuntimeStatus',
    'Test-PrereleaseContainerHealth',
    'Test-PrereleaseHtmlIdentity',
    'Write-PrereleaseJsonFile',
    'Get-PrereleaseLiveIdentity',
    'Test-PrereleaseHttpRound',
    'Get-PrereleaseTestActionPlan',
    'Complete-PrereleaseEvidence',
    'Assert-PrereleaseFormAttempt',
    'Assert-PrereleaseEnvironmentFile'
)
