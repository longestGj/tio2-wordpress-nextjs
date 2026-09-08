[CmdletBinding()]
param(
    [ValidateSet('Start', 'Status', 'Stop', 'ResetData', 'Test', 'TestLiveForms')]
    [string] $Action = 'Status',
    [switch] $Plan,
    [switch] $Json,
    [string] $RepositoryRoot = '',
    [string] $StateRoot = '',
    [string] $DockerExecutable = 'docker'
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'prerelease/Prerelease.Core.psm1') -Force

function Write-PrereleaseResult {
    param([Parameter(Mandatory)] [object] $Value)
    $Value | ConvertTo-Json -Depth 12 -Compress
}

try {
    if ($Plan) {
        Write-PrereleaseResult (Get-PrereleasePlan)
        exit 0
    }

    if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
        $RepositoryRoot = Split-Path -Parent $PSScriptRoot
    }
    $RepositoryRoot = (Resolve-Path -LiteralPath $RepositoryRoot).Path
    if ([string]::IsNullOrWhiteSpace($StateRoot)) {
        $StateRoot = Join-Path $RepositoryRoot '.prerelease'
    }
    $environmentFile = Join-Path $RepositoryRoot '.env.prerelease.local'
    $compose = @(Get-PrereleaseComposeArguments -RepositoryRoot $RepositoryRoot -EnvironmentFile $environmentFile)

    switch ($Action) {
        'Start' {
            $identity = Get-PrereleaseGitIdentity -RepositoryRoot $RepositoryRoot
            Assert-PrereleaseSource -GitIdentity $identity | Out-Null
            Assert-PrereleasePorts -Ports @(3100, 8180) | Out-Null
            $lock = Enter-PrereleaseLock -StateRoot $StateRoot
            try {
                Write-PrereleaseResult ([pscustomobject]@{
                        action = 'Start'; state = 'PREFLIGHT_PASSED'; commit = $identity.commit
                    })
            }
            finally { Exit-PrereleaseLock -Lock $lock }
        }
        'Status' {
            $runPath = Join-Path $StateRoot 'current-run.json'
            if (Test-Path -LiteralPath $runPath) {
                Get-Content -LiteralPath $runPath -Raw
            }
            else {
                Write-PrereleaseResult ([pscustomobject]@{ action = 'Status'; state = 'STOPPED' })
            }
        }
        'Stop' {
            $lock = Enter-PrereleaseLock -StateRoot $StateRoot
            try {
                Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + 'stop') | Out-Null
                Write-PrereleaseResult ([pscustomobject]@{ action = 'Stop'; state = 'STOPPED' })
            }
            finally { Exit-PrereleaseLock -Lock $lock }
        }
        'ResetData' {
            $identity = Get-PrereleaseGitIdentity -RepositoryRoot $RepositoryRoot
            Assert-PrereleaseSource -GitIdentity $identity | Out-Null
            $lock = Enter-PrereleaseLock -StateRoot $StateRoot
            try {
                $running = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('ps', '--status', 'running', '--quiet')))
                if (@($running | Where-Object { $_ -ne '' }).Count -ne 0) {
                    throw 'ResetData requires the prerelease stack to be stopped.'
                }
                $logicalVolumes = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('config', '--volumes')) | Where-Object { $_ -ne '' })
                $ownedVolumes = @($logicalVolumes | ForEach-Object { "d16-tio2-my-prerelease_$($_)" })
                Assert-PrereleaseOwnedVolumes -Volumes $ownedVolumes | Out-Null
                foreach ($volume in $ownedVolumes) {
                    Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @('volume', 'rm', $volume) | Out-Null
                }
                Write-PrereleaseResult ([pscustomobject]@{ action = 'ResetData'; state = 'RESET' })
            }
            finally { Exit-PrereleaseLock -Lock $lock }
        }
        default {
            throw "$Action is not implemented yet."
        }
    }
}
catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
