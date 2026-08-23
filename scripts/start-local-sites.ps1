[CmdletBinding()]
param(
    [switch] $Plan,
    [switch] $KeepRunning,
    [switch] $Stop,
    [switch] $Status,
    [string] $StateDirectory,
    [string] $CancellationPath,
    [ValidateRange(10, 300)]
    [int] $HealthTimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
if (-not $StateDirectory) {
    $StateDirectory = Join-Path $RepositoryRoot '.tmp/local-sites'
}
$StateDirectory = [System.IO.Path]::GetFullPath($StateDirectory)
$StatePath = Join-Path $StateDirectory 'sites.json'
$LocalSites = @(
    [PSCustomObject]@{siteId = 'tio2-a'; port = 3001; distDir = '.next-tio2-a'},
    [PSCustomObject]@{siteId = 'tio2-b'; port = 3002; distDir = '.next-tio2-b'}
)

if (@(@($Plan, $KeepRunning, $Stop, $Status) | Where-Object { $_ }).Count -gt 1) {
    throw 'Use only one of -Plan, -KeepRunning, -Stop, or -Status.'
}

if ($Plan) {
    [ordered]@{
        mode = 'plan'
        sites = @(
            foreach ($Site in $LocalSites) {
                [ordered]@{siteId = $Site.siteId; port = $Site.port; distDir = $Site.distDir}
            }
        )
        startup = [ordered]@{
            statePersistence = 'after-each-start'
            cancellation = 'cooperative-file'
        }
        stop = [ordered]@{
            preflightAllRecords = $true
            finalIdentityCheck = 'immediate'
            terminationTarget = 'validated-process-handle'
        }
    } | ConvertTo-Json -Depth 5 -Compress
    exit 0
}

$NodeExecutable = (Get-Command node -ErrorAction Stop).Source
$NodeExecutable = (Resolve-Path -LiteralPath $NodeExecutable).Path
$NextCliPath = (Resolve-Path -LiteralPath (Join-Path $RepositoryRoot 'node_modules/next/dist/bin/next')).Path
if ($CancellationPath) {
    $CancellationPath = [System.IO.Path]::GetFullPath($CancellationPath)
}

function Test-ProcessIdentity {
    param(
        [Parameter(Mandatory = $true)]
        [object] $Record
    )

    $Process = Get-Process -Id ([int]$Record.pid) -ErrorAction SilentlyContinue
    if (-not $Process) {
        return [PSCustomObject]@{running = $false; matches = $true; process = $null; reason = 'not-running'}
    }

    $ExpectedExecutable = [System.IO.Path]::GetFullPath([string]$Record.executablePath)
    $ActualExecutable = $null
    try {
        $ActualExecutable = [System.IO.Path]::GetFullPath($Process.Path)
    }
    catch {
        return [PSCustomObject]@{running = $true; matches = $false; process = $Process; reason = 'unreadable-executable'}
    }

    if (-not [string]::Equals($ActualExecutable, $ExpectedExecutable, [System.StringComparison]::OrdinalIgnoreCase)) {
        return [PSCustomObject]@{running = $true; matches = $false; process = $Process; reason = 'executable-mismatch'}
    }

    $ActualStartTicks = $Process.StartTime.ToUniversalTime().Ticks
    if ($ActualStartTicks -ne [long]$Record.startTimeUtcTicks) {
        return [PSCustomObject]@{running = $true; matches = $false; process = $Process; reason = 'start-time-mismatch'}
    }

    $CimProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$Record.pid)" -ErrorAction SilentlyContinue
    $ExpectedNextCli = [string]$Record.nextCliPath
    $ExpectedPort = "--port $([int]$Record.port)"
    if (
        -not $CimProcess -or
        -not $CimProcess.CommandLine -or
        $CimProcess.CommandLine.IndexOf($ExpectedNextCli, [System.StringComparison]::OrdinalIgnoreCase) -lt 0 -or
        $CimProcess.CommandLine.IndexOf($ExpectedPort, [System.StringComparison]::OrdinalIgnoreCase) -lt 0
    ) {
        return [PSCustomObject]@{running = $true; matches = $false; process = $Process; reason = 'command-line-mismatch'}
    }

    return [PSCustomObject]@{running = $true; matches = $true; process = $Process; reason = 'matched'}
}

function Read-ControllerState {
    if (-not (Test-Path -LiteralPath $StatePath)) {
        return $null
    }

    $State = Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json
    if ([int]$State.schemaVersion -ne 1) {
        throw "Unsupported local site state schema in $StatePath."
    }
    if (-not [string]::Equals(
        [System.IO.Path]::GetFullPath([string]$State.repositoryRoot),
        $RepositoryRoot,
        [System.StringComparison]::OrdinalIgnoreCase
    )) {
        throw "Local site state belongs to a different repository: $StatePath"
    }

    return $State
}

function Stop-RecordedSites {
    param(
        [Parameter(Mandatory = $true)]
        [object[]] $Records,
        [switch] $RemoveState
    )

    $Mismatches = [System.Collections.Generic.List[string]]::new()
    foreach ($Record in $Records) {
        $Identity = Test-ProcessIdentity -Record $Record
        if ($Identity.running -and -not $Identity.matches) {
            $Mismatches.Add("Refused to stop PID $($Record.pid) for $($Record.siteId): $($Identity.reason).")
        }
    }

    if ($Mismatches.Count -gt 0) {
        throw ($Mismatches -join ' ')
    }

    foreach ($Record in $Records) {
        $Identity = Test-ProcessIdentity -Record $Record
        if (-not $Identity.running) {
            continue
        }
        if (-not $Identity.matches) {
            throw "Refused to stop PID $($Record.pid) for $($Record.siteId) after final identity check: $($Identity.reason)."
        }

        $Process = [System.Diagnostics.Process]$Identity.process
        try {
            $Process.Kill()
            [void]$Process.WaitForExit(10000)
        }
        catch {
            throw "Local site process $($Record.pid) did not stop cleanly."
        }
        if (-not $Process.HasExited) {
            throw "Local site process $($Record.pid) did not stop within 10 seconds."
        }
    }

    if ($RemoveState -and (Test-Path -LiteralPath $StatePath)) {
        Remove-Item -LiteralPath $StatePath -Force
    }
}

function Test-CancellationRequested {
    return [bool]($CancellationPath -and (Test-Path -LiteralPath $CancellationPath))
}

function Test-PortOpen {
    param([Parameter(Mandatory = $true)][int] $Port)

    $Client = [System.Net.Sockets.TcpClient]::new()
    try {
        $Connect = $Client.ConnectAsync('localhost', $Port)
        if (-not $Connect.Wait(250)) {
            return $false
        }
        return $Client.Connected
    }
    catch {
        return $false
    }
    finally {
        $Client.Dispose()
    }
}

function Wait-SiteHealthy {
    param(
        [Parameter(Mandatory = $true)][object] $Record,
        [Parameter(Mandatory = $true)][System.Diagnostics.Process] $Process
    )

    $Deadline = [DateTime]::UtcNow.AddSeconds($HealthTimeoutSeconds)
    $HealthUrl = "http://localhost:$($Record.port)/"
    while ([DateTime]::UtcNow -lt $Deadline) {
        if (Test-CancellationRequested) {
            throw "Local site startup was cancelled while waiting for $($Record.siteId)."
        }
        if ($Process.HasExited) {
            throw "$($Record.siteId) exited with code $($Process.ExitCode). See $($Record.stderrLog)."
        }

        try {
            $Response = Invoke-WebRequest -UseBasicParsing -Uri $HealthUrl -TimeoutSec 5
            if ([int]$Response.StatusCode -eq 200) {
                return
            }
        }
        catch {
            if (Test-CancellationRequested) {
                throw "Local site startup was cancelled while waiting for $($Record.siteId)."
            }
            Start-Sleep -Milliseconds 500
        }
    }

    throw "$($Record.siteId) did not become healthy at $HealthUrl within $HealthTimeoutSeconds seconds."
}

function Write-ControllerState {
    param(
        [Parameter(Mandatory = $true)][string] $SessionId,
        [Parameter(Mandatory = $true)][object[]] $Records
    )

    $SerializableRecords = @(
        foreach ($Record in $Records) {
            [ordered]@{
                siteId = $Record.siteId
                port = $Record.port
                distDir = $Record.distDir
                pid = $Record.pid
                startTimeUtcTicks = $Record.startTimeUtcTicks
                executablePath = $Record.executablePath
                nextCliPath = $Record.nextCliPath
                stdoutLog = $Record.stdoutLog
                stderrLog = $Record.stderrLog
            }
        }
    )
    $State = [ordered]@{
        schemaVersion = 1
        repositoryRoot = $RepositoryRoot
        sessionId = $SessionId
        startedAtUtc = [DateTime]::UtcNow.ToString('o')
        sites = $SerializableRecords
    }
    $TemporaryStatePath = "$StatePath.$SessionId.tmp"
    [System.IO.File]::WriteAllText(
        $TemporaryStatePath,
        ($State | ConvertTo-Json -Depth 5 -Compress),
        [System.Text.UTF8Encoding]::new($false)
    )
    Move-Item -LiteralPath $TemporaryStatePath -Destination $StatePath -Force
    return $State
}

function Start-OneSite {
    param([Parameter(Mandatory = $true)][object] $Site)

    $StandardOutput = Join-Path $StateDirectory "$($Site.siteId).stdout.log"
    $StandardError = Join-Path $StateDirectory "$($Site.siteId).stderr.log"
    foreach ($LogPath in @($StandardOutput, $StandardError)) {
        if (Test-Path -LiteralPath $LogPath) {
            Remove-Item -LiteralPath $LogPath -Force
        }
    }

    $EnvironmentValues = [ordered]@{
        SITE_ID = $Site.siteId
        NEXT_DIST_DIR = $Site.distDir
        NODE_ENV = 'production'
        WORDPRESS_GRAPHQL_URL = 'http://localhost:8080/graphql'
        PREVIEW_SECRET = 'local-preview-test-secret'
        REVALIDATION_SECRET = 'local-revalidation-test-secret'
        VERCEL_ENV = $null
        SEO_ALLOW_INDEXING_LOCAL_TEST = $null
    }
    $PreviousValues = @{}
    foreach ($Name in $EnvironmentValues.Keys) {
        $PreviousValues[$Name] = [Environment]::GetEnvironmentVariable($Name, 'Process')
    }

    try {
        foreach ($Name in $EnvironmentValues.Keys) {
            [Environment]::SetEnvironmentVariable($Name, $EnvironmentValues[$Name], 'Process')
        }
        $Process = Start-Process `
            -FilePath $NodeExecutable `
            -ArgumentList @($NextCliPath, 'start', '--hostname', 'localhost', '--port', [string]$Site.port) `
            -WorkingDirectory $RepositoryRoot `
            -WindowStyle Hidden `
            -RedirectStandardOutput $StandardOutput `
            -RedirectStandardError $StandardError `
            -PassThru
    }
    finally {
        foreach ($Name in $PreviousValues.Keys) {
            [Environment]::SetEnvironmentVariable($Name, $PreviousValues[$Name], 'Process')
        }
    }

    $Process.Refresh()
    return [PSCustomObject]@{
        siteId = $Site.siteId
        port = $Site.port
        distDir = $Site.distDir
        pid = $Process.Id
        startTimeUtcTicks = $Process.StartTime.ToUniversalTime().Ticks
        executablePath = $NodeExecutable
        nextCliPath = $NextCliPath
        stdoutLog = $StandardOutput
        stderrLog = $StandardError
        process = $Process
    }
}

if ($Status) {
    $State = Read-ControllerState
    $StatusSites = @(
        foreach ($Site in $LocalSites) {
            $Running = $false
            if ($State) {
                $Record = @($State.sites | Where-Object { $_.siteId -eq $Site.siteId }) | Select-Object -First 1
                if ($Record) {
                    $Identity = Test-ProcessIdentity -Record $Record
                    $Running = [bool]($Identity.running -and $Identity.matches)
                }
            }
            [ordered]@{siteId = $Site.siteId; port = $Site.port; running = $Running}
        }
    )
    [ordered]@{mode = 'status'; sites = $StatusSites} | ConvertTo-Json -Depth 4 -Compress
    exit 0
}

if ($Stop) {
    $State = Read-ControllerState
    if ($State) {
        Stop-RecordedSites -Records @($State.sites) -RemoveState
    }
    [ordered]@{mode = 'stopped'; ports = @(3001, 3002)} | ConvertTo-Json -Compress
    exit 0
}

if (Test-Path -LiteralPath $StatePath) {
    $ExistingState = Read-ControllerState
    $RunningSites = @(
        foreach ($Record in @($ExistingState.sites)) {
            $Identity = Test-ProcessIdentity -Record $Record
            if ($Identity.running -and $Identity.matches) { $Record.siteId }
        }
    )
    if ($RunningSites.Count -gt 0) {
        throw "Local sites are already controlled by this worktree: $($RunningSites -join ', ')."
    }
    Remove-Item -LiteralPath $StatePath -Force
}

foreach ($Site in $LocalSites) {
    if (Test-PortOpen -Port $Site.port) {
        throw "Port $($Site.port) is already in use. No process was stopped."
    }
    $BuildPath = Join-Path $RepositoryRoot $Site.distDir
    if (-not (Test-Path -LiteralPath (Join-Path $BuildPath 'BUILD_ID'))) {
        throw "Missing production build for $($Site.siteId) at $BuildPath."
    }
}

New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null
$SessionId = [Guid]::NewGuid().ToString('D')
$StartedRecords = [System.Collections.Generic.List[object]]::new()
$LeaveRunning = $false
try {
    foreach ($Site in $LocalSites) {
        if (Test-CancellationRequested) {
            throw 'Local site startup was cancelled before the next process launch.'
        }
        $Started = Start-OneSite -Site $Site
        $StartedRecords.Add($Started)
        $State = Write-ControllerState -SessionId $SessionId -Records @($StartedRecords)
        Wait-SiteHealthy -Record $Started -Process $Started.process
    }

    $State = Write-ControllerState -SessionId $SessionId -Records @($StartedRecords)

    if ($KeepRunning) {
        $LeaveRunning = $true
        [ordered]@{
            mode = 'running'
            sessionId = $State.sessionId
            sites = @(
                foreach ($Record in @($State.sites)) {
                    [ordered]@{siteId = $Record.siteId; port = $Record.port; pid = $Record.pid}
                }
            )
        } | ConvertTo-Json -Depth 4 -Compress
        exit 0
    }

    Write-Host 'Both local sites are healthy. Press Ctrl+C to stop only these controller-owned processes.'
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    if (-not $LeaveRunning -and $StartedRecords.Count -gt 0) {
        Stop-RecordedSites -Records @($StartedRecords) -RemoveState
    }
    if (-not $LeaveRunning -and $CancellationPath -and (Test-Path -LiteralPath $CancellationPath)) {
        Remove-Item -LiteralPath $CancellationPath -Force
    }
}
