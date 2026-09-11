[CmdletBinding()]
param(
    [ValidateSet('Plan', 'Start', 'Status', 'Stop')]
    [string] $Action = 'Status',
    [switch] $Json,
    [string] $RepositoryRoot = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $RepositoryRoot) { $RepositoryRoot = Split-Path -Parent $PSScriptRoot }
$CommonDirectory = & git -C $RepositoryRoot rev-parse --path-format=absolute --git-common-dir
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve canonical development repository.' }
$RepositoryRoot = Split-Path -Parent $CommonDirectory.Trim()
$RepositoryRoot = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$ComposeFile = Join-Path $RepositoryRoot 'wordpress/docker-compose.yml'
$EnvironmentFile = Join-Path $RepositoryRoot 'wordpress/.env'
$StateDirectory = Join-Path $RepositoryRoot '.runtime'
$StatePath = Join-Path $StateDirectory 'development-wordpress.json'
$ComposeArguments = @('compose', '--project-name', 'wordpress', '--env-file', $EnvironmentFile, '-f', $ComposeFile)

function Write-Result([object] $Value) { $Value | ConvertTo-Json -Depth 12 -Compress }
function Same-Path([string] $Left, [string] $Right) {
    if (-not $Left -or -not $Right) { return $false }
    return [string]::Equals([IO.Path]::GetFullPath($Left).TrimEnd('\', '/'), [IO.Path]::GetFullPath($Right).TrimEnd('\', '/'), [StringComparison]::OrdinalIgnoreCase)
}
function Invoke-Docker([string[]] $Arguments) {
    $SavedPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $Output = @(& docker @Arguments 2>&1)
        $Code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $SavedPreference }
    if ($Code -ne 0) { throw 'Docker command failed; ownership could not be verified.' }
    return ($Output | ForEach-Object { $_.ToString() }) -join "`n"
}
function Read-Containers {
    $Ids = Invoke-Docker @('ps', '--all', '--quiet', '--filter', 'label=com.docker.compose.project=wordpress')
    foreach ($ContainerId in @($Ids -split '\r?\n' | Where-Object { $_ })) {
        $Container = (Invoke-Docker @('inspect', $ContainerId, '--format', '{{json .}}')) | ConvertFrom-Json
        $Labels = $Container.Config.Labels
        $Files = @(([string]$Labels.'com.docker.compose.project.config_files') -split ',')
        $WorkingDirectory = [string]$Labels.'com.docker.compose.project.working_dir'
        if ($Labels.'com.docker.compose.project' -ne 'wordpress' -or
            $Files.Count -ne 1 -or -not (Same-Path $Files[0] $ComposeFile) -or
            (-not (Same-Path $WorkingDirectory (Split-Path -Parent $ComposeFile)) -and -not (Same-Path $WorkingDirectory $RepositoryRoot))) {
            throw 'Development WordPress owner identity mismatch.'
        }
        $Container
    }
}
function Read-Record {
    if (-not (Test-Path -LiteralPath $StatePath)) { return $null }
    $Record = Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json
    if ($Record.schemaVersion -ne 1 -or $Record.project -ne 'wordpress' -or
        -not (Same-Path $Record.repositoryRoot $RepositoryRoot) -or
        -not (Same-Path $Record.composeFile $ComposeFile) -or @($Record.containerIds).Count -eq 0) {
        throw 'Development WordPress recorded owner identity mismatch.'
    }
    return $Record
}
function Assert-RecordedContainers([object] $Record, [object[]] $Containers) {
    $LiveIds = @($Containers | ForEach-Object { $_.Id } | Sort-Object)
    $RecordedIds = @($Record.containerIds | Sort-Object)
    if (($LiveIds -join ',') -ne ($RecordedIds -join ',')) { throw 'Development WordPress container identity mismatch.' }
}
function Write-Record([object[]] $Containers) {
    $Commit = & git -C $RepositoryRoot rev-parse HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Cannot record development WordPress commit.' }
    $Record = [ordered]@{schemaVersion=1;repositoryRoot=$RepositoryRoot;commit=$Commit.Trim();composeFile=$ComposeFile;project='wordpress';containerIds=@($Containers | ForEach-Object { $_.Id });createdAt=[DateTime]::UtcNow.ToString('o')}
    $TemporaryPath = "$StatePath.$([Guid]::NewGuid().ToString('N')).tmp"
    [IO.File]::WriteAllText($TemporaryPath, ($Record | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
    if (Test-Path -LiteralPath $StatePath) { [IO.File]::Replace($TemporaryPath, $StatePath, $null) }
    else { [IO.File]::Move($TemporaryPath, $StatePath) }
    return $Record
}

if ($Action -eq 'Plan') {
    Write-Result ([ordered]@{project='wordpress';endpoint='http://127.0.0.1:8080';composeFile=$ComposeFile;repositoryRoot=$RepositoryRoot;volumes='persistent'})
    exit 0
}

$Lock = $null
try {
    if ($Action -in @('Start', 'Stop')) {
        New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null
        $Lock = [IO.File]::Open((Join-Path $StateDirectory 'development-wordpress.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    }
    $Record = Read-Record
    $Containers = @(Read-Containers)
    switch ($Action) {
        'Status' {
            if ($Record) { Assert-RecordedContainers $Record $Containers }
            $State = if ($Record) { 'expected-owner' } elseif ($Containers.Count) { 'unrecorded-owner' } else { 'absent' }
            Write-Result ([ordered]@{project='wordpress';state=$State;containerIds=@($Containers | ForEach-Object { $_.Id });running=@($Containers | Where-Object { $_.State.Running }).Count -gt 0})
        }
        'Start' {
            if (-not (Test-Path -LiteralPath $EnvironmentFile)) { throw 'Missing canonical wordpress/.env.' }
            $Listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -eq 8080 })
            if ($Listeners.Count) {
                $ExpectedListener = @($Containers | Where-Object {
                    $_.Config.Labels.'com.docker.compose.service' -eq 'wordpress' -and $_.State.Running -and
                    @($_.NetworkSettings.Ports.'80/tcp' | Where-Object { $_.HostPort -eq '8080' -and $_.HostIp -in @('127.0.0.1', '0.0.0.0') }).Count -gt 0
                })
                if ($ExpectedListener.Count -ne 1) { throw 'Port 8080 has an unknown listener; no containers were started or stopped.' }
            }
            if ($Record) { Assert-RecordedContainers $Record $Containers }
            $null = Invoke-Docker ($ComposeArguments + @('up', '-d', 'db', 'wordpress'))
            $Containers = @(Read-Containers)
            if (-not $Containers.Count) { throw 'No development WordPress containers found after start.' }
            $Record = Write-Record $Containers
            Write-Result ([ordered]@{project='wordpress';state='started';record=$Record})
        }
        'Stop' {
            if (-not $Record) { throw 'No development WordPress ownership record; refusing to stop.' }
            Assert-RecordedContainers $Record $Containers
            # Re-read both labels and IDs immediately before the project stop.
            $Containers = @(Read-Containers)
            Assert-RecordedContainers $Record $Containers
            $null = Invoke-Docker ($ComposeArguments + @('stop', 'wordpress', 'db'))
            try {
                $StoppedContainers = @(Read-Containers)
                Assert-RecordedContainers $Record $StoppedContainers
                foreach ($Before in $Containers) {
                    $After = @($StoppedContainers | Where-Object { $_.Id -eq $Before.Id })[0]
                    foreach ($Label in @('com.docker.compose.project', 'com.docker.compose.project.working_dir', 'com.docker.compose.project.config_files', 'com.docker.compose.service')) {
                        if ($Before.Config.Labels.$Label -cne $After.Config.Labels.$Label) {
                            throw "Container $($Before.Id) owner labels changed."
                        }
                    }
                    if ($Before.Config.Labels.'com.docker.compose.service' -in @('wordpress', 'db') -and $After.State.Running -ne $false) {
                        throw "Container $($Before.Id) is still running."
                    }
                }
            } catch {
                throw "Development WordPress verification failed after stop: $($_.Exception.Message) Ownership record was preserved."
            }
            Write-Result ([ordered]@{project='wordpress';state='stopped';volumes='persistent'})
        }
    }
} finally { if ($Lock) { $Lock.Dispose() } }
