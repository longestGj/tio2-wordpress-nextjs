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

Export-ModuleMember -Function @(
    'Get-PrereleasePlan',
    'Get-PrereleaseGitIdentity',
    'Assert-PrereleaseSource',
    'Enter-PrereleaseLock',
    'Exit-PrereleaseLock',
    'Assert-PrereleasePorts',
    'Invoke-PrereleaseDocker',
    'Get-PrereleaseComposeArguments',
    'Assert-PrereleaseOwnedVolumes'
)
