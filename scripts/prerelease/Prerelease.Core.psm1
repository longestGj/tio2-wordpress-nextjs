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

    $output = @(& $DockerExecutable @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
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
    if ($LiveIdentity.reachable -ne $true) { $reasons.Add('runtime_unreachable') }
    if ($LiveIdentity.buildId -ne $RunManifest.buildId) { $reasons.Add('build_id_mismatch') }
    if ($LiveIdentity.siteId -ne $RunManifest.siteId) { $reasons.Add('site_id_mismatch') }
    if ($LiveIdentity.cmsIdentitySha256 -ne $RunManifest.cmsIdentitySha256) { $reasons.Add('cms_identity_mismatch') }
    if ($LiveIdentity.sourceCommit -and $LiveIdentity.sourceCommit -ne $RunManifest.commit) { $reasons.Add('source_commit_mismatch') }
    if ($LiveIdentity.runId -and $RunManifest.runId -and $LiveIdentity.runId -ne $RunManifest.runId) { $reasons.Add('run_id_mismatch') }

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
        [Parameter(Mandatory)] [string] $RunRoot
    )

    $cmsPath = Join-Path $RunRoot 'cms-identity.json'
    $cmsSha = if (Test-Path -LiteralPath $cmsPath) { Get-PrereleaseSha256 -Path $cmsPath } else { $null }
    try {
        $response = Invoke-RestMethod -Uri 'http://127.0.0.1:3100/api/prerelease-identity' -Method Get -TimeoutSec 10
        [pscustomobject]@{
            reachable         = $true
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
            buildId           = $null
            siteId            = $null
            runId             = $null
            sourceCommit      = $null
            cmsIdentitySha256 = $cmsSha
        }
    }
}

function Test-PrereleaseHttpRound {
    [CmdletBinding()]
    param()

    $targets = @(
        'http://127.0.0.1:3100/',
        'http://127.0.0.1:3100/request-a-quote/',
        'http://127.0.0.1:3100/request-sample/',
        'http://127.0.0.1:3100/request-documents/',
        'http://127.0.0.1:3100/privacy-policy/',
        'http://127.0.0.1:8180/graphql'
    )
    $results = foreach ($target in $targets) {
        try {
            $response = Invoke-WebRequest -Uri $target -Method Get -UseBasicParsing -TimeoutSec 30
            if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) { throw "HTTP $($response.StatusCode)" }
            [pscustomobject]@{ url = $target; status = [int] $response.StatusCode }
        }
        catch { throw "Prerelease GET check failed for ${target}: $($_.Exception.Message)" }
    }
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
            spec                  = 'tests/e2e/prerelease-live-forms.spec.ts'
            allowNonGet           = $true
            expectedWorkflowCount = 3
        }
    }
    [pscustomobject][ordered]@{
        action                    = 'Test'
        spec                      = 'tests/e2e/prerelease-smoke.spec.ts'
        allowNonGet               = $false
        expectedExternalPostCount = 0
    }
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
    'Write-PrereleaseJsonFile',
    'Get-PrereleaseLiveIdentity',
    'Test-PrereleaseHttpRound',
    'Get-PrereleaseTestActionPlan',
    'Assert-PrereleaseEnvironmentFile'
)
