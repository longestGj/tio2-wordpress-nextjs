[CmdletBinding()]
param(
    [ValidateSet('Start', 'Status', 'Stop', 'ResetData', 'Test', 'TestLiveForms')]
    [string] $Action = 'Status',
    [switch] $Plan,
    [switch] $Json,
    [string] $RepositoryRoot = '',
    [string] $StateRoot = '',
    [string] $DockerExecutable = 'docker',
    [string] $NpxExecutable = 'npx'
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'prerelease/Prerelease.Core.psm1') -Force

function Write-PrereleaseResult {
    param([Parameter(Mandatory)] [object] $Value)
    $Value | ConvertTo-Json -Depth 12 -Compress
}

function Set-PrereleaseComposeEnvironment {
    param(
        [Parameter(Mandatory)] [string] $SourcePath,
        [Parameter(Mandatory)] [string] $RunRoot,
        [Parameter(Mandatory)] [string] $RunId,
        [Parameter(Mandatory)] [string] $Commit,
        [string] $BuildId = 'building'
    )
    $env:PRERELEASE_SOURCE_DIR = $SourcePath.Replace('\', '/')
    $env:PRERELEASE_RUN_DIR = $RunRoot.Replace('\', '/')
    $env:PRERELEASE_RUN_ID = $RunId
    $env:PRERELEASE_SOURCE_COMMIT = $Commit
    $env:PRERELEASE_NEXT_BUILD_ID = $BuildId
}

function Read-PrereleaseCurrentRun {
    param([Parameter(Mandatory)] [string] $Root)
    $pointerPath = Join-Path $Root 'current-run.json'
    if (-not (Test-Path -LiteralPath $pointerPath)) { return $null }
    $pointer = Get-Content -LiteralPath $pointerPath -Raw | ConvertFrom-Json
    if (-not $pointer.manifestPath -or -not (Test-Path -LiteralPath $pointer.manifestPath)) {
        throw 'The prerelease current-run pointer is invalid.'
    }
    Get-Content -LiteralPath $pointer.manifestPath -Raw | ConvertFrom-Json
}

function Read-PrereleaseEnvironmentFlag {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] [string] $Name
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=\s*(?<value>.*?)\s*$')) {
            return $Matches.value.Trim("'`"") -eq 'true'
        }
    }
    return $false
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
            if (-not (Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
                throw "Create the ignored prerelease environment file first: $environmentFile"
            }
            Assert-PrereleasePorts -Ports @(3100, 8180) | Out-Null
            $lock = Enter-PrereleaseLock -StateRoot $StateRoot
            try {
                $frozen = New-PrereleaseFrozenSource -RepositoryRoot $RepositoryRoot -Commit $identity.commit -RunsRoot (Join-Path $StateRoot 'runs')
                [System.IO.Directory]::CreateDirectory((Join-Path $frozen.runRoot 'seed-support')) | Out-Null
                $manifestPath = Join-Path $frozen.runRoot 'run-manifest.json'
                $manifest = [ordered]@{
                    schemaVersion     = 1
                    state             = 'STARTING'
                    failedStage       = $null
                    runId             = $frozen.runId
                    siteId            = 'tio2-my'
                    commit            = $identity.commit
                    branch            = 'main'
                    sourceArchive     = 'source.tar'
                    archiveSha256     = $frozen.archiveSha256
                    sourcePath        = $frozen.sourcePath
                    buildId           = $null
                    cmsIdentitySha256 = $null
                    dockerImages      = @()
                    verification      = @()
                    startedAt         = [DateTimeOffset]::UtcNow.ToString('o')
                    completedAt       = $null
                }
                Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
                try {
                    Set-PrereleaseComposeEnvironment -SourcePath $frozen.sourcePath -RunRoot $frozen.runRoot -RunId $frozen.runId -Commit $identity.commit

                    $manifest.failedStage = 'cms_start'
                    Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
                    Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('up', '-d', '--wait', '--wait-timeout', '300', '--force-recreate', 'db', 'wordpress')) | Out-Null

                    $manifest.failedStage = 'cms_bootstrap'
                    Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
                    Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('--profile', 'tools', 'run', '--rm', 'wpcli', 'bash', '/workspace/ops/prerelease/bootstrap-wordpress.sh')) | Out-Null

                    $manifest.failedStage = 'next_build'
                    Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
                    Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('--profile', 'tools', 'run', '--rm', 'builder')) | Out-Null
                    $buildIdPath = Join-Path $frozen.sourcePath '.next-prerelease/BUILD_ID'
                    if (-not (Test-Path -LiteralPath $buildIdPath -PathType Leaf)) { throw 'The Next.js build did not produce .next-prerelease/BUILD_ID.' }
                    $manifest.buildId = (Get-Content -LiteralPath $buildIdPath -Raw).Trim()
                    if ([string]::IsNullOrWhiteSpace($manifest.buildId)) { throw 'The Next.js Build ID is empty.' }

                    $manifest.failedStage = 'web_start'
                    Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
                    Set-PrereleaseComposeEnvironment -SourcePath $frozen.sourcePath -RunRoot $frozen.runRoot -RunId $frozen.runId -Commit $identity.commit -BuildId $manifest.buildId
                    Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('up', '-d', '--wait', '--wait-timeout', '300', '--force-recreate', 'web')) | Out-Null

                    $cmsIdentityPath = Join-Path $frozen.runRoot 'cms-identity.json'
                    if (-not (Test-Path -LiteralPath $cmsIdentityPath -PathType Leaf)) { throw 'CMS identity was not produced.' }
                    $manifest.cmsIdentitySha256 = Get-PrereleaseSha256 -Path $cmsIdentityPath
                    $manifest.dockerImages = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('images', '--format', 'json')) | Where-Object { $_ -ne '' })

                    $manifest.failedStage = 'http_verification'
                    Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
                    $manifest.verification = @(
                        [pscustomobject]@{ round = 1; results = @(Test-PrereleaseHttpRound) },
                        [pscustomobject]@{ round = 2; results = @(Test-PrereleaseHttpRound) }
                    )
                    $candidate = [pscustomobject]$manifest
                    $candidate.state = 'HEALTHY'
                    $live = Get-PrereleaseLiveIdentity -RunManifest $candidate -RunRoot $frozen.runRoot
                    $boundStatus = Get-PrereleaseRuntimeStatus -RunManifest $candidate -CurrentMainCommit $identity.commit -LiveIdentity $live
                    if ($boundStatus.state -ne 'HEALTHY') { throw "Runtime identity did not bind: $($boundStatus.reasons -join ', ')" }

                    $manifest.state = 'HEALTHY'
                    $manifest.failedStage = $null
                    $manifest.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
                    Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
                    Write-PrereleaseJsonFile -Value ([ordered]@{ runId = $frozen.runId; manifestPath = $manifestPath }) -Path (Join-Path $StateRoot 'current-run.json')
                    Write-PrereleaseResult ([pscustomobject]$manifest)
                }
                catch {
                    $manifest.state = 'FAILED'
                    $manifest.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
                    $manifest.error = $_.Exception.Message.Split([Environment]::NewLine)[0]
                    Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
                    throw
                }
            }
            finally { Exit-PrereleaseLock -Lock $lock }
        }
        'Status' {
            $manifest = Read-PrereleaseCurrentRun -Root $StateRoot
            if ($null -eq $manifest) {
                Write-PrereleaseResult ([pscustomobject]@{ action = 'Status'; state = 'STOPPED' })
            } elseif ($manifest.state -eq 'STOPPED') {
                Write-PrereleaseResult ([pscustomobject]@{ action = 'Status'; state = 'STOPPED'; runId = $manifest.runId; commit = $manifest.commit })
            } else {
                $runRoot = Split-Path -Parent ((Get-Content -LiteralPath (Join-Path $StateRoot 'current-run.json') -Raw | ConvertFrom-Json).manifestPath)
                Set-PrereleaseComposeEnvironment -SourcePath $manifest.sourcePath -RunRoot $runRoot -RunId $manifest.runId -Commit $manifest.commit -BuildId $manifest.buildId
                $mainCommit = (@(& git -C $RepositoryRoot rev-parse refs/heads/main 2>$null) | Select-Object -First 1).Trim()
                $live = Get-PrereleaseLiveIdentity -RunManifest $manifest -RunRoot $runRoot
                Write-PrereleaseResult (Get-PrereleaseRuntimeStatus -RunManifest $manifest -CurrentMainCommit $mainCommit -LiveIdentity $live)
            }
        }
        'Stop' {
            $lock = Enter-PrereleaseLock -StateRoot $StateRoot
            try {
                $manifest = Read-PrereleaseCurrentRun -Root $StateRoot
                if ($null -ne $manifest) {
                    $runRoot = Split-Path -Parent ((Get-Content -LiteralPath (Join-Path $StateRoot 'current-run.json') -Raw | ConvertFrom-Json).manifestPath)
                    Set-PrereleaseComposeEnvironment -SourcePath $manifest.sourcePath -RunRoot $runRoot -RunId $manifest.runId -Commit $manifest.commit -BuildId $manifest.buildId
                }
                Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + 'stop') | Out-Null
                if ($null -ne $manifest) {
                    $manifest.state = 'STOPPED'
                    $manifest | Add-Member -NotePropertyName stoppedAt -NotePropertyValue ([DateTimeOffset]::UtcNow.ToString('o')) -Force
                    $manifestPath = (Get-Content -LiteralPath (Join-Path $StateRoot 'current-run.json') -Raw | ConvertFrom-Json).manifestPath
                    Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
                }
                Write-PrereleaseResult ([pscustomobject]@{ action = 'Stop'; state = 'STOPPED' })
            }
            finally { Exit-PrereleaseLock -Lock $lock }
        }
        'ResetData' {
            $identity = Get-PrereleaseGitIdentity -RepositoryRoot $RepositoryRoot
            Assert-PrereleaseSource -GitIdentity $identity | Out-Null
            $lock = Enter-PrereleaseLock -StateRoot $StateRoot
            try {
                Set-PrereleaseComposeEnvironment -SourcePath $RepositoryRoot -RunRoot $StateRoot -RunId 'reset' -Commit $identity.commit
                $running = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('ps', '--status', 'running', '--quiet')))
                if (@($running | Where-Object { $_ -ne '' }).Count -ne 0) {
                    throw 'ResetData requires the prerelease stack to be stopped.'
                }
                $logicalVolumes = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('config', '--volumes')) | Where-Object { $_ -ne '' })
                $ownedVolumes = @($logicalVolumes | ForEach-Object { "d16-tio2-my-prerelease_$($_)" })
                Assert-PrereleaseOwnedVolumes -Volumes $ownedVolumes | Out-Null
                $existingVolumes = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @('volume', 'ls', '--format', '{{.Name}}'))
                foreach ($volume in @($ownedVolumes | Where-Object { $existingVolumes -contains $_ })) {
                    Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @('volume', 'rm', $volume) | Out-Null
                }
                $pointer = Join-Path $StateRoot 'current-run.json'
                if (Test-Path -LiteralPath $pointer) { Remove-Item -LiteralPath $pointer -Force }
                Write-PrereleaseResult ([pscustomobject]@{ action = 'ResetData'; state = 'RESET' })
            }
            finally { Exit-PrereleaseLock -Lock $lock }
        }
        { $_ -in @('Test', 'TestLiveForms') } {
            $manifest = Read-PrereleaseCurrentRun -Root $StateRoot
            if ($null -eq $manifest -or $manifest.state -ne 'HEALTHY') {
                throw "$Action requires a recorded HEALTHY prerelease runtime."
            }
            $runRoot = Split-Path -Parent ((Get-Content -LiteralPath (Join-Path $StateRoot 'current-run.json') -Raw | ConvertFrom-Json).manifestPath)
            $mainCommit = (@(& git -C $RepositoryRoot rev-parse refs/heads/main 2>$null) | Select-Object -First 1).Trim()
            $live = Get-PrereleaseLiveIdentity -RunManifest $manifest -RunRoot $runRoot
            $runtimeStatus = Get-PrereleaseRuntimeStatus -RunManifest $manifest -CurrentMainCommit $mainCommit -LiveIdentity $live
            if ($runtimeStatus.state -ne 'HEALTHY') {
                throw "$Action requires HEALTHY runtime identity; actual state is $($runtimeStatus.state)."
            }
            $liveEnabled = Read-PrereleaseEnvironmentFlag -Path $environmentFile -Name 'PRERELEASE_LIVE_FORMS_ENABLED'
            $actionPlan = Get-PrereleaseTestActionPlan -Action $Action -LiveFormsEnabled $liveEnabled
            $commandUuid = [guid]::NewGuid().ToString()
            $evidenceId = [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + $commandUuid
            $evidenceRoot = Join-Path $RepositoryRoot "docs/verification/prerelease/runs/$evidenceId"
            if (Test-Path -LiteralPath $evidenceRoot) { throw "Prerelease evidence run already exists: $evidenceId" }
            [System.IO.Directory]::CreateDirectory($evidenceRoot) | Out-Null

            $previousBaseUrl = $env:TIO2_PRERELEASE_BASE_URL
            $previousEvidence = $env:TIO2_PRERELEASE_EVIDENCE_DIR
            $previousUuid = $env:TIO2_PRERELEASE_COMMAND_UUID
            try {
                $env:TIO2_PRERELEASE_BASE_URL = 'http://127.0.0.1:3100'
                $env:TIO2_PRERELEASE_EVIDENCE_DIR = $evidenceRoot
                $env:TIO2_PRERELEASE_COMMAND_UUID = $commandUuid
                Push-Location $RepositoryRoot
                try {
                    $testOutput = @(& $NpxExecutable playwright test $actionPlan.spec --workers=1 2>&1)
                    $testExit = $LASTEXITCODE
                }
                finally { Pop-Location }
                if ($testExit -ne 0) { throw "$Action Playwright suite failed with exit code $testExit." }
            }
            finally {
                $env:TIO2_PRERELEASE_BASE_URL = $previousBaseUrl
                $env:TIO2_PRERELEASE_EVIDENCE_DIR = $previousEvidence
                $env:TIO2_PRERELEASE_COMMAND_UUID = $previousUuid
            }
            $resultPath = Join-Path $evidenceRoot 'result.json'
            if (-not (Test-Path -LiteralPath $resultPath -PathType Leaf)) { throw "$Action did not produce result.json." }
            $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
            Write-PrereleaseResult ([pscustomobject]@{
                    action = $Action; state = 'PASSED'; runId = $manifest.runId
                    evidenceId = $evidenceId; result = $result
                })
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
