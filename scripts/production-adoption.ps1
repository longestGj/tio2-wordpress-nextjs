#requires -Version 7.2
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Stage','Recover','Status')][string]$Operation,
    [Parameter(Mandatory)][string]$ConfigPath,
    [string]$PrereleaseReceiptPath,
    [string]$RunRoot
)
$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Import-Module (Join-Path $PSScriptRoot 'production/Production.Core.psm1') -Force

function Read-AdoptionJson([string]$Path) {
    Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable -ErrorAction Stop
}

function Save-AdoptionJson([string]$Path, $Value) {
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 50 -Compress))
    $temporary = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
    $stream = [IO.File]::Open($temporary, 'CreateNew', 'Write', 'None')
    try { $stream.Write($bytes); $stream.Flush($true) } finally { $stream.Dispose() }
    [IO.File]::Move($temporary, $Path, $true)
}

function Assert-AdoptionConnection($Config) {
    try {
        if ($Config.Keys.Count -ne 10 -or $Config.siteId -cne 'tio2-my' -or $Config.host -cne '129.146.68.82' -or $Config.port -ne 22 -or $Config.username -cne 'deploy') { throw 'invalid' }
        if ($Config.hostKey -notmatch '^ssh-ed25519 ([A-Za-z0-9+/]+={0,2})$' -or -not (Test-Path -LiteralPath $Config.identityFile -PathType Leaf)) { throw 'invalid' }
        $hostKeyBytes = [Convert]::FromBase64String($Matches[1])
        if ($Config.recoveryImage -notmatch '^sha256:[a-f0-9]{64}$') { throw 'invalid' }
        if ($Config.mariaDbRecoveryImage -notmatch '^sha256:[a-f0-9]{64}$') { throw 'invalid' }
        if ($Config.web3FormsAccessKey -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' -or $Config.sampleRecipient -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') { throw 'invalid' }
        if ($hostKeyBytes.Length -ne 51) { throw 'invalid' }
    } catch { throw 'Production adoption connection is missing or invalid.' }
}

function Get-AdoptionSshOptions($Config, [string]$EvidenceRoot) {
    $knownHosts = Join-Path $EvidenceRoot 'known_hosts'
    [IO.File]::WriteAllText($knownHosts, "$($Config.host) $($Config.hostKey)`n", [Text.UTF8Encoding]::new($false))
    return @('-F','none','-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$knownHosts",'-o','GlobalKnownHostsFile=none','-o','ConnectTimeout=15','-i',$Config.identityFile)
}

function New-AdoptionAgeIdentity($Config, [string]$EvidenceRoot) {
    $privateRoot = Join-Path $repository '.production/private'
    [IO.Directory]::CreateDirectory($privateRoot) | Out-Null
    $identity = Join-Path $privateRoot 'tio2-backup.agekey'
    $public = Join-Path $EvidenceRoot 'backup.age.pub'
    if (-not (Test-Path -LiteralPath $identity -PathType Leaf)) {
        $mount = "type=bind,source=$privateRoot,target=/keys"
        & docker run --rm --network none --mount $mount --entrypoint age-keygen $Config.recoveryImage -o /keys/tio2-backup.agekey 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Failed to create the local backup identity.' }
    }
    $mount = "type=bind,source=$privateRoot,target=/keys,readonly"
    $recipient = @(& docker run --rm --network none --mount $mount --entrypoint age-keygen $Config.recoveryImage -y /keys/tio2-backup.agekey 2>$null)
    if ($LASTEXITCODE -ne 0 -or $recipient.Count -ne 1 -or $recipient[0] -notmatch '^age1[ac-hj-np-z02-9]{20,}$') { throw 'Local backup identity is invalid.' }
    [IO.File]::WriteAllText($public, $recipient[0] + "`n", [Text.UTF8Encoding]::new($false))
    return [pscustomobject]@{ identityPath = $identity; publicPath = $public; publicSha256 = Get-ProductionSha256 -Path $public }
}

function Send-AdoptionStage($Config, [string]$EvidenceRoot) {
    $allowed = @('release.tar.gz','release-manifest.json','release-proof.json','admin-bundle.tar.gz','admin-bundle-manifest.json','backup.age.pub','production-input.json')
    $options = Get-AdoptionSshOptions $Config $EvidenceRoot
    $destination = "deploy@$($Config.host)"
    & ssh @options -p $Config.port $destination 'install -d -m 700 /home/deploy/tio2-incoming /home/deploy/tio2-outgoing' 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Failed to prepare the fixed incoming directory.' }
    foreach ($name in $allowed) {
        $path = Join-Path $EvidenceRoot $name
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Adoption stage is missing $name." }
        & scp @options -P $Config.port $path "${destination}:/home/deploy/tio2-incoming/$name" 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Failed to upload $name." }
    }
}

function Invoke-AdoptionStage($Config) {
    if (-not $PrereleaseReceiptPath) { throw 'PrereleaseReceiptPath is required for Stage.' }
    $package = New-ProductionPackage -RepositoryRoot $repository -OutputRoot (Join-Path $repository '.production') -PrereleaseReceiptPath $PrereleaseReceiptPath
    $root = Split-Path -Parent $package.archivePath
    $identity = New-AdoptionAgeIdentity $Config $root
    $productionInputPath = Join-Path $root 'production-input.json'
    Save-AdoptionJson $productionInputPath ([ordered]@{schemaVersion='tio2-production-input-v1';siteId='tio2-my';web3FormsAccessKey=[string]$Config.web3FormsAccessKey;sampleRecipient=[string]$Config.sampleRecipient})
    $productionInputSha256 = Get-ProductionSha256 $productionInputPath
    $archive = Join-Path $root 'admin-bundle.tar.gz'
    $builder = Join-Path $repository 'ops/production/build_adoption_archive.py'
    $buildOutput = @(& python $builder --revision $package.commit --output $archive 2>&1)
    if ($LASTEXITCODE -ne 0) { throw 'Failed to build the fixed administrator archive.' }
    try { $admin = ($buildOutput -join "`n") | ConvertFrom-Json -AsHashtable -ErrorAction Stop } catch { throw 'Administrator archive result is invalid.' }
    if ($admin.toolCommit -cne $package.commit -or (Get-ProductionSha256 $archive) -cne $admin.archiveSha256) { throw 'Administrator archive identity mismatch.' }
    $binding = [ordered]@{schemaVersion='tio2-production-adoption-stage-v1';siteId='tio2-my';host=$Config.host;commit=$package.commit;archiveSha256=$package.archiveSha256;manifestSha256=$package.manifestSha256;proofSha256=$package.proofSha256;adminArchiveSha256=$admin.archiveSha256;adminManifestSha256=$admin.manifestSha256;backupPublicKeySha256=$identity.publicSha256;productionInputSha256=$productionInputSha256}
    Save-AdoptionJson (Join-Path $root 'adoption-stage.json') $binding
    Send-AdoptionStage $Config $root
    $remoteRoot = "/root/tio2-adoption-$($package.commit)"
    $rootCommand = "set -e; cd /home/deploy/tio2-incoming; test '`$(sha256sum admin-bundle.tar.gz | cut -d' ' -f1)' = '$($admin.archiveSha256)'; install -d -m 700 '$remoteRoot'; tar -xzf admin-bundle.tar.gz -C '$remoteRoot' --no-same-owner; chown -R root:root '$remoteRoot'; '$remoteRoot/admin/root-adopt.sh'"
    return [pscustomobject][ordered]@{state='STAGED';runRoot=$root;commit=$package.commit;uploadedFiles=7;adminArchiveSha256=$admin.archiveSha256;backupPublicKeySha256=$identity.publicSha256;productionInputSha256=$productionInputSha256;rootCommand=$rootCommand}
}

function Invoke-AdoptionRecover($Config, [string]$EvidenceRoot) {
    if (-not $EvidenceRoot) { throw 'RunRoot is required for Recover.' }
    $root = [IO.Path]::GetFullPath($EvidenceRoot)
    $stage = Read-AdoptionJson (Join-Path $root 'adoption-stage.json')
    if ($stage.schemaVersion -cne 'tio2-production-adoption-stage-v1' -or $stage.siteId -cne 'tio2-my' -or $stage.host -cne $Config.host) { throw 'Local adoption stage identity mismatch.' }
    $options = Get-AdoptionSshOptions $Config $root
    $destination = "deploy@$($Config.host)"
    $phasePart = Join-Path $root 'adoption-phase-a.json.part'
    & scp @options -P $Config.port "${destination}:/home/deploy/tio2-outgoing/adoption-phase-a.json" $phasePart 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Phase-A receipt is not available.' }
    [IO.File]::Move($phasePart, (Join-Path $root 'adoption-phase-a.json'), $true)
    $phase = Read-AdoptionJson (Join-Path $root 'adoption-phase-a.json')
    if ($phase.schemaVersion -cne 'tio2-adoption-phase-a-v1' -or $phase.siteId -cne 'tio2-my' -or $phase.state -cne 'AWAITING_OFFHOST_VERIFICATION' -or $phase.candidate.commit -cne $stage.commit -or $phase.candidate.archiveSha256 -cne $stage.archiveSha256 -or $phase.candidate.manifestSha256 -cne $stage.manifestSha256 -or $phase.candidate.proofSha256 -cne $stage.proofSha256 -or $phase.candidate.backupPublicKeySha256 -cne $stage.backupPublicKeySha256 -or $phase.candidate.productionInputSha256 -cne $stage.productionInputSha256) { throw 'Phase-A receipt identity mismatch.' }
    if ($phase.backup.backupId -notmatch '^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{40}-[a-f0-9]{32}$' -or $phase.backup.ciphertextSha256 -notmatch '^[a-f0-9]{64}$') { throw 'Phase-A backup receipt is invalid.' }
    $cipherPart = Join-Path $root 'ciphertext.age.part'
    & scp @options -P $Config.port "${destination}:/home/deploy/tio2-outgoing/$($phase.backup.backupId).tar.age" $cipherPart 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0 -or (Get-ProductionSha256 $cipherPart) -cne $phase.backup.ciphertextSha256) { throw 'Downloaded adoption backup is missing or changed.' }
    [IO.File]::Move($cipherPart, (Join-Path $root 'ciphertext.age'), $true)
    $identity = Join-Path $repository '.production/private/tio2-backup.agekey'
    if (-not (Test-Path -LiteralPath $identity -PathType Leaf)) { throw 'Local backup identity is unavailable.' }
    $tooling = Join-Path $repository 'ops/production'
    $rootMount = "type=bind,source=$root,target=/run-evidence"
    $identityMount = "type=bind,source=$identity,target=/identity.age,readonly"
    $toolMount = "type=bind,source=$tooling,target=/tooling,readonly"
    & docker run --rm --network none --env "TIO2_MARIADB_RECOVERY_IMAGE=$($Config.mariaDbRecoveryImage)" --mount $rootMount --mount $identityMount --mount $toolMount --mount 'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock' --entrypoint python3 $Config.recoveryImage -B /tooling/adoption_recovery.py
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath (Join-Path $root 'adoption-evidence.json') -PathType Leaf)) { throw 'Off-host adoption recovery failed.' }
    & scp @options -P $Config.port (Join-Path $root 'adoption-evidence.json') "${destination}:/home/deploy/tio2-incoming/adoption-evidence.json" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Failed to upload adoption recovery evidence.' }
    return [pscustomobject][ordered]@{state='OFFHOST_VERIFIED';runRoot=$root;planHash=$phase.planHash;backupId=$phase.backup.backupId;evidenceSha256=Get-ProductionSha256 (Join-Path $root 'adoption-evidence.json')}
}

function Get-AdoptionStatus($Config, [string]$EvidenceRoot) {
    if (-not $EvidenceRoot) { throw 'RunRoot is required for Status.' }
    $root = [IO.Path]::GetFullPath($EvidenceRoot)
    $stage = Read-AdoptionJson (Join-Path $root 'adoption-stage.json')
    $phase = Read-AdoptionJson (Join-Path $root 'adoption-phase-a.json')
    if ($stage.schemaVersion -cne 'tio2-production-adoption-stage-v1' -or $stage.siteId -cne 'tio2-my' -or $stage.host -cne $Config.host -or $phase.schemaVersion -cne 'tio2-adoption-phase-a-v1' -or $phase.siteId -cne 'tio2-my' -or $phase.candidate.commit -cne $stage.commit) { throw 'Local adoption identity mismatch.' }
    $options = Get-AdoptionSshOptions $Config $root
    $destination = "deploy@$($Config.host)"
    $part = Join-Path $root 'adoption-current.json.part'
    & scp @options -P $Config.port "${destination}:/home/deploy/tio2-outgoing/adoption-current.json" $part 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Production adoption status is not available.' }
    $status = Read-AdoptionJson $part
    if ($status.schemaVersion -cne 'tio2-production-adoption-receipt-v1' -or $status.siteId -cne 'tio2-my' -or $status.planHash -cne $phase.planHash -or $status.backup.backupId -cne $phase.backup.backupId -or $status.state -notin @('AWAITING_OFFHOST_VERIFICATION','AWAITING_DNS','PUBLIC_READY')) { Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue; throw 'Production adoption status identity mismatch.' }
    $destinationPath = Join-Path $root 'adoption-current.json'
    [IO.File]::Move($part, $destinationPath, $true)
    return [pscustomobject][ordered]@{state=$status.state;runRoot=$root;planHash=$status.planHash;backupId=$status.backup.backupId;statusSha256=Get-ProductionSha256 $destinationPath}
}

try {
    $config = Read-AdoptionJson ([IO.Path]::GetFullPath($ConfigPath)); Assert-AdoptionConnection $config
    if ($Operation -eq 'Stage') { $result = Invoke-AdoptionStage $config }
    elseif ($Operation -eq 'Recover') { $result = Invoke-AdoptionRecover $config $RunRoot }
    else { $result = Get-AdoptionStatus $config $RunRoot }
    $result | ConvertTo-Json -Depth 30 -Compress
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
