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

function Invoke-PrereleaseStart {
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string] $StateRoot,
        [Parameter(Mandatory)] [string] $EnvironmentFile,
        [Parameter(Mandatory)] [string[]] $ComposeArguments,
        [Parameter(Mandatory)] [string] $DockerExecutable
    )

    $identity = Get-PrereleaseGitIdentity -RepositoryRoot $RepositoryRoot
    Assert-PrereleaseSource -GitIdentity $identity | Out-Null
    if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf)) {
        throw "Create the ignored prerelease environment file first: $EnvironmentFile"
    }
    Assert-PrereleaseEnvironmentFile -Path $EnvironmentFile | Out-Null
    Assert-PrereleasePorts -Ports @(3100, 8180) | Out-Null

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
    $webStartAttempted = $false
    try {
        Set-PrereleaseComposeEnvironment -SourcePath $frozen.sourcePath -RunRoot $frozen.runRoot -RunId $frozen.runId -Commit $identity.commit

        $manifest.failedStage = 'cms_start'
        Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
        Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($ComposeArguments + @('up', '-d', '--wait', '--wait-timeout', '300', '--force-recreate', 'db', 'wordpress')) | Out-Null

        $manifest.failedStage = 'cms_bootstrap'
        Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
        Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($ComposeArguments + @('--profile', 'tools', 'run', '--rm', 'wpcli', 'bash', '/workspace/ops/prerelease/bootstrap-wordpress.sh')) | Out-Null

        $manifest.failedStage = 'next_build'
        Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
        Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($ComposeArguments + @('--profile', 'tools', 'run', '--rm', 'builder')) | Out-Null
        $buildIdPath = Join-Path $frozen.sourcePath '.next-prerelease/BUILD_ID'
        if (-not (Test-Path -LiteralPath $buildIdPath -PathType Leaf)) { throw 'The Next.js build did not produce .next-prerelease/BUILD_ID.' }
        $manifest.buildId = (Get-Content -LiteralPath $buildIdPath -Raw).Trim()
        if ([string]::IsNullOrWhiteSpace($manifest.buildId)) { throw 'The Next.js Build ID is empty.' }

        $manifest.failedStage = 'web_start'
        Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
        Set-PrereleaseComposeEnvironment -SourcePath $frozen.sourcePath -RunRoot $frozen.runRoot -RunId $frozen.runId -Commit $identity.commit -BuildId $manifest.buildId
        $webStartAttempted = $true
        Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($ComposeArguments + @('up', '-d', '--wait', '--wait-timeout', '300', '--force-recreate', 'web')) | Out-Null

        $cmsIdentityPath = Join-Path $frozen.runRoot 'cms-identity.json'
        if (-not (Test-Path -LiteralPath $cmsIdentityPath -PathType Leaf)) { throw 'CMS identity was not produced.' }
        $manifest.cmsIdentitySha256 = Get-PrereleaseSha256 -Path $cmsIdentityPath
        $manifest.dockerImages = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($ComposeArguments + @('images', '--format', 'json')) | Where-Object { $_ -ne '' })

        $manifest.failedStage = 'http_verification'
        Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
        $manifest.verification = @(
            [pscustomobject]@{ round = 1; results = @(Test-PrereleaseHttpRound -ExpectedRunId $frozen.runId -ExpectedCommit $identity.commit -ExpectedBuildId $manifest.buildId) },
            [pscustomobject]@{ round = 2; results = @(Test-PrereleaseHttpRound -ExpectedRunId $frozen.runId -ExpectedCommit $identity.commit -ExpectedBuildId $manifest.buildId) }
        )
        $candidate = [pscustomobject]$manifest
        $candidate.state = 'HEALTHY'
        $live = Get-PrereleaseLiveIdentity -RunManifest $candidate -RunRoot $frozen.runRoot -ComposeArguments $ComposeArguments -DockerExecutable $DockerExecutable
        $boundStatus = Get-PrereleaseRuntimeStatus -RunManifest $candidate -CurrentMainCommit $identity.commit -LiveIdentity $live
        if ($boundStatus.state -ne 'HEALTHY') { throw "Runtime identity did not bind: $($boundStatus.reasons -join ', ')" }

        $manifest.state = 'HEALTHY'
        $manifest.failedStage = $null
        $manifest.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
        Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
        Write-PrereleaseJsonFile -Value ([ordered]@{ runId = $frozen.runId; manifestPath = $manifestPath }) -Path (Join-Path $StateRoot 'current-run.json')
        return [pscustomobject]$manifest
    }
    catch {
        $startError = $_
        if ($webStartAttempted) {
            try {
                Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($ComposeArguments + @('stop', 'web')) | Out-Null
                $manifest.webCleanup = 'STOPPED_AFTER_FAILED_START'
            }
            catch {
                $manifest.webCleanup = 'STOP_FAILED_AFTER_FAILED_START'
            }
        }
        $manifest.state = 'FAILED'
        $manifest.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
        $manifest.error = $startError.Exception.Message.Split([Environment]::NewLine)[0]
        Write-PrereleaseJsonFile -Value $manifest -Path $manifestPath
        throw $startError
    }
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
            $lock = Enter-PrereleaseLock -StateRoot $StateRoot
            try {
                $startResult = Invoke-PrereleaseStart -RepositoryRoot $RepositoryRoot -StateRoot $StateRoot -EnvironmentFile $environmentFile -ComposeArguments $compose -DockerExecutable $DockerExecutable
                Write-PrereleaseResult $startResult
            }
            finally { Exit-PrereleaseLock -Lock $lock }
        }
        'Status' {
            $resetOperationPath = Join-Path $StateRoot 'reset-operation.json'
            if (Test-Path -LiteralPath $resetOperationPath -PathType Leaf) {
                $resetOperation = Get-Content -LiteralPath $resetOperationPath -Raw | ConvertFrom-Json
                if ($resetOperation.state -eq 'RESETTING') {
                    Write-PrereleaseResult ([pscustomobject]@{
                            action = 'Status'; state = 'RESETTING'; operation = 'ResetData'
                            oldRunId = $resetOperation.oldRunId; targetVolumes = @($resetOperation.targetVolumes)
                        })
                    break
                }
            }
            $manifest = Read-PrereleaseCurrentRun -Root $StateRoot
            if ($null -eq $manifest) {
                Write-PrereleaseResult ([pscustomobject]@{ action = 'Status'; state = 'STOPPED' })
            } elseif ($manifest.state -eq 'STOPPED') {
                Write-PrereleaseResult ([pscustomobject]@{ action = 'Status'; state = 'STOPPED'; runId = $manifest.runId; commit = $manifest.commit })
            } elseif ($manifest.action -eq 'ResetData' -and $manifest.state -in @('RESETTING', 'FAILED')) {
                Write-PrereleaseResult ([pscustomobject]@{
                        action = 'Status'; state = $manifest.state; operation = 'ResetData'
                        oldRunId = $manifest.oldRunId; targetVolumes = @($manifest.targetVolumes)
                    })
            } else {
                $runRoot = Split-Path -Parent ((Get-Content -LiteralPath (Join-Path $StateRoot 'current-run.json') -Raw | ConvertFrom-Json).manifestPath)
                Set-PrereleaseComposeEnvironment -SourcePath $manifest.sourcePath -RunRoot $runRoot -RunId $manifest.runId -Commit $manifest.commit -BuildId $manifest.buildId
                $mainCommit = (@(& git -C $RepositoryRoot rev-parse refs/heads/main 2>$null) | Select-Object -First 1).Trim()
                $live = Get-PrereleaseLiveIdentity -RunManifest $manifest -RunRoot $runRoot -ComposeArguments $compose -DockerExecutable $DockerExecutable
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
                else {
                    $stopIdentity = Get-PrereleaseGitIdentity -RepositoryRoot $RepositoryRoot
                    Set-PrereleaseComposeEnvironment -SourcePath $RepositoryRoot -RunRoot $StateRoot -RunId 'unrecorded-stop' -Commit $stopIdentity.commit
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
            if (-not (Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
                throw "Create the ignored prerelease environment file first: $environmentFile"
            }
            Assert-PrereleaseEnvironmentFile -Path $environmentFile | Out-Null
            $removedVolumes = @()
            $lock = Enter-PrereleaseLock -StateRoot $StateRoot
            try {
                $oldManifest = Read-PrereleaseCurrentRun -Root $StateRoot
                $oldRunId = if ($null -ne $oldManifest) { $oldManifest.runId } else { $null }
                $oldCmsIdentitySha256 = if ($null -ne $oldManifest) { $oldManifest.cmsIdentitySha256 } else { $null }
                $resetLogicalVolumes = @('prerelease_db', 'prerelease_wp')
                $ownedVolumes = @($resetLogicalVolumes | ForEach-Object { "d16-tio2-my-prerelease_$($_)" })
                $resetOperationPath = Join-Path $StateRoot 'reset-operation.json'
                $resetOperation = [ordered]@{
                    schemaVersion        = 1
                    action               = 'ResetData'
                    state                = 'RESETTING'
                    composeProject       = 'd16-tio2-my-prerelease'
                    targetVolumes        = @($ownedVolumes)
                    oldRunId             = $oldRunId
                    oldCmsIdentitySha256 = $oldCmsIdentitySha256
                    startedAt            = [DateTimeOffset]::UtcNow.ToString('o')
                }
                Write-PrereleaseJsonFile -Value $resetOperation -Path $resetOperationPath
                Write-PrereleaseResult ([pscustomobject]$resetOperation)

                try {
                    if ($null -ne $oldManifest) {
                        $oldRunRoot = if ($oldManifest.sourcePath) { Split-Path -Parent $oldManifest.sourcePath } else { $StateRoot }
                        Set-PrereleaseComposeEnvironment -SourcePath $oldManifest.sourcePath -RunRoot $oldRunRoot -RunId $oldManifest.runId -Commit $oldManifest.commit -BuildId $oldManifest.buildId
                    }
                    else {
                        Set-PrereleaseComposeEnvironment -SourcePath $RepositoryRoot -RunRoot $StateRoot -RunId 'reset' -Commit $identity.commit
                    }
                    $running = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('ps', '--status', 'running', '--quiet')))
                    if (@($running | Where-Object { $_ -ne '' }).Count -ne 0) {
                        throw 'ResetData requires the prerelease stack to be stopped.'
                    }
                    $logicalVolumes = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('config', '--volumes')) | Where-Object { $_ -ne '' })
                    foreach ($logicalVolume in $resetLogicalVolumes) {
                        if ($logicalVolumes -notcontains $logicalVolume) { throw "Required prerelease data volume is missing from Compose: $logicalVolume" }
                    }
                    Assert-PrereleaseOwnedVolumes -Volumes $ownedVolumes | Out-Null
                    Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @($compose + @('rm', '--force', '--stop', 'web', 'wordpress', 'db')) | Out-Null
                    $existingVolumes = @(Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @('volume', 'ls', '--format', '{{.Name}}'))
                    foreach ($volume in @($ownedVolumes | Where-Object { $existingVolumes -contains $_ })) {
                        Invoke-PrereleaseDocker -DockerExecutable $DockerExecutable -Arguments @('volume', 'rm', $volume) | Out-Null
                        $removedVolumes += $volume
                    }

                    $newManifest = Invoke-PrereleaseStart -RepositoryRoot $RepositoryRoot -StateRoot $StateRoot -EnvironmentFile $environmentFile -ComposeArguments $compose -DockerExecutable $DockerExecutable
                    $resetReceipt = [ordered]@{
                        schemaVersion         = 1
                        action                = 'ResetData'
                        state                 = $newManifest.state
                        composeProject        = 'd16-tio2-my-prerelease'
                        removedVolumes        = @($removedVolumes)
                        oldRunId              = $oldRunId
                        oldCmsIdentitySha256  = $oldCmsIdentitySha256
                        newRunId              = $newManifest.runId
                        newCmsIdentitySha256  = $newManifest.cmsIdentitySha256
                        completedAt           = [DateTimeOffset]::UtcNow.ToString('o')
                    }
                    $newPointer = Get-Content -LiteralPath (Join-Path $StateRoot 'current-run.json') -Raw | ConvertFrom-Json
                    Write-PrereleaseJsonFile -Value $resetReceipt -Path (Join-Path (Split-Path -Parent $newPointer.manifestPath) 'reset-receipt.json')
                    $resetOperation.state = 'HEALTHY'
                    $resetOperation.newRunId = $newManifest.runId
                    $resetOperation.newCmsIdentitySha256 = $newManifest.cmsIdentitySha256
                    $resetOperation.completedAt = $resetReceipt.completedAt
                    Write-PrereleaseJsonFile -Value $resetOperation -Path $resetOperationPath
                    Write-PrereleaseResult ([pscustomobject]$resetReceipt)
                }
                catch {
                    $resetOperation.state = 'FAILED'
                    $resetOperation.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
                    $resetOperation.error = $_.Exception.Message.Split([Environment]::NewLine)[0]
                    Write-PrereleaseJsonFile -Value $resetOperation -Path $resetOperationPath
                    throw
                }
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
            Set-PrereleaseComposeEnvironment -SourcePath $manifest.sourcePath -RunRoot $runRoot -RunId $manifest.runId -Commit $manifest.commit -BuildId $manifest.buildId
            $live = Get-PrereleaseLiveIdentity -RunManifest $manifest -RunRoot $runRoot -ComposeArguments $compose -DockerExecutable $DockerExecutable
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
