Set-StrictMode -Version Latest

# This version names an immutable reviewed hash tuple, mirrored by the installed
# Python policy. Contract edits require a new version and administrator upgrade.
$script:FrozenContractVersion = 'tio2-production-contracts-v1'
$script:FrozenContractSha256 = [ordered]@{
    'ops/production/release-package.schema.json' = 'ad8dbea67cb5c7c4a8503e830b32a061ee46859c3992e0570cc42d4d38362346'
    'ops/production/release-surface.json' = '42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152'
    'ops/production/migration-manifest.json' = '230197ea63467b5557e7d1bdb960503b3c636f15eb7564894d124c9a7f1d7b7a'
}

$script:ProductionRuntimePaths = @(
    '.env.example', '.gitattributes', 'next.config.ts', 'package.json', 'package-lock.json', 'proxy.ts', 'tsconfig.json', 'vercel.json',
    'app', 'components', 'content', 'lib', 'public', 'sites', 'wordpress/bootstrap', 'wordpress/plugins', 'ops/production'
)

function Invoke-ProductionGit {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string[]] $Arguments
    )

    $output = @(& git -C $RepositoryRoot @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git -C <repository> $($Arguments -join ' ')"
    }
    return $output
}

function Get-ProductionGitIdentity {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot)

    $resolvedRoot = (Resolve-Path -LiteralPath $RepositoryRoot -ErrorAction Stop).Path
    $branch = (Invoke-ProductionGit -RepositoryRoot $resolvedRoot -Arguments @('branch', '--show-current') | Select-Object -First 1).Trim()
    $commit = (Invoke-ProductionGit -RepositoryRoot $resolvedRoot -Arguments @('rev-parse', 'HEAD') | Select-Object -First 1).Trim().ToLowerInvariant()
    $entries = @(Invoke-ProductionGit -RepositoryRoot $resolvedRoot -Arguments @('status', '--porcelain=v1', '--untracked-files=all') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

    [pscustomobject][ordered]@{ branch = $branch; commit = $commit; entries = @($entries) }
}

function Get-ProductionSha256 {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $Path)

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $algorithm = [System.Security.Cryptography.SHA256]::Create()
        try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream)) -replace '-', '').ToLowerInvariant() }
        finally { $algorithm.Dispose() }
    }
    finally { $stream.Dispose() }
}

function Assert-ProductionArchiveMemberPath {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $Path)

    if ([string]::IsNullOrWhiteSpace($Path) -or $Path.StartsWith('/') -or $Path.StartsWith('\\') -or $Path.Contains('\') -or $Path -match '^[A-Za-z]:') {
        throw 'Unsafe archive member path.'
    }
    $parts = @($Path -split '/')
    if (@($parts | Where-Object { $_ -eq '' -or $_ -eq '.' -or $_ -eq '..' }).Count -ne 0) { throw 'Unsafe archive member path.' }
    return $Path
}

function Assert-ProductionReceiptPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string] $PrereleaseReceiptPath
    )

    if (-not (Test-Path -LiteralPath $PrereleaseReceiptPath -PathType Leaf)) { throw 'Prerelease receipt does not exist.' }
    $repository = (Resolve-Path -LiteralPath $RepositoryRoot -ErrorAction Stop).Path
    $receipt = (Resolve-Path -LiteralPath $PrereleaseReceiptPath -ErrorAction Stop).Path
    $runsRoot = [System.IO.Path]::GetFullPath((Join-Path $repository '.prerelease/runs'))
    $prefix = $runsRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $receipt.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Prerelease receipt path must be below .prerelease/runs.' }
    return $receipt
}

function Assert-ProductionCandidate {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object] $GitIdentity,
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string] $PrereleaseReceiptPath
    )

    if ($GitIdentity.branch -ne 'main' -or @($GitIdentity.entries).Count -ne 0) { throw 'Production packaging requires a clean main worktree.' }
    if ($GitIdentity.commit -notmatch '^[a-f0-9]{40}$') { throw 'Production packaging requires a valid Git commit.' }
    $receiptPath = Assert-ProductionReceiptPath -RepositoryRoot $RepositoryRoot -PrereleaseReceiptPath $PrereleaseReceiptPath
    try {
        $receiptBytes = [System.IO.File]::ReadAllBytes($receiptPath)
        $receipt = [System.Text.Encoding]::UTF8.GetString($receiptBytes) | ConvertFrom-Json -ErrorAction Stop
    }
    catch { throw 'Prerelease receipt is not valid JSON.' }
    if ($receipt.state -ne 'HEALTHY' -or -not [string]::IsNullOrWhiteSpace([string] $receipt.failedStage) -or [string]::IsNullOrWhiteSpace([string] $receipt.completedAt)) {
        throw 'Prerelease receipt is not a completed healthy run.'
    }
    $completionText = if ($receipt.completedAt -is [DateTime]) { $receipt.completedAt.ToUniversalTime().ToString('o') } else { [string] $receipt.completedAt }
    $completion = [DateTimeOffset]::MinValue
    if ($completionText -notmatch '(Z|[+-][0-9]{2}:[0-9]{2})$' -or -not [DateTimeOffset]::TryParse($completionText, [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::RoundtripKind, [ref] $completion)) {
        throw 'Prerelease receipt is not a completed healthy run.'
    }
    if ($receipt.commit -ne $GitIdentity.commit -or $receipt.siteId -ne 'tio2-my' -or [string]::IsNullOrWhiteSpace([string] $receipt.buildId) -or [string]::IsNullOrWhiteSpace([string] $receipt.cmsIdentitySha256) -or [string] $receipt.cmsIdentitySha256 -notmatch '^[a-fA-F0-9]{64}$') {
        throw 'Prerelease receipt does not contain complete matching commit, site, Build, and CMS identity fields.'
    }
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { $receiptSha256 = ([System.BitConverter]::ToString($algorithm.ComputeHash($receiptBytes)) -replace '-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
    return [pscustomobject][ordered]@{ git = $GitIdentity; receiptPath = $receiptPath; receipt = $receipt; receiptSha256 = $receiptSha256 }
}

function New-ProductionUtf8File {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $Path, [Parameter(Mandatory)] [string] $Content)

    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
        $writer = [System.IO.StreamWriter]::new($stream, [System.Text.UTF8Encoding]::new($false), 4096, $true)
        try { $writer.Write($Content); $writer.Flush() }
        finally { $writer.Dispose() }
    }
    finally { $stream.Dispose() }
}

function New-ProductionGzipFile {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [System.IO.Stream] $SourceStream, [Parameter(Mandatory)] [string] $DestinationPath)

    $SourceStream.Position = 0
    $output = [System.IO.File]::Open($DestinationPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
        $gzip = [System.IO.Compression.GZipStream]::new($output, [System.IO.Compression.CompressionLevel]::Optimal, $true)
        try { $SourceStream.CopyTo($gzip) }
        finally { $gzip.Dispose() }
    }
    finally { $output.Dispose() }
}

function Test-ProductionGitTreePath {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot, [Parameter(Mandatory)] [string] $Commit, [Parameter(Mandatory)] [string] $Path)

    $files = @(Invoke-ProductionGit -RepositoryRoot $RepositoryRoot -Arguments @('ls-tree', '-r', '--name-only', $Commit))
    return @($files | Where-Object { $_ -eq $Path -or $_.StartsWith("$Path/", [System.StringComparison]::Ordinal) }).Count -gt 0
}

function Get-ProductionArchivePathspecs {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot, [Parameter(Mandatory)] [string] $Commit)

    $paths = [System.Collections.Generic.List[string]]::new()
    foreach ($path in $script:ProductionRuntimePaths) {
        if (Test-ProductionGitTreePath -RepositoryRoot $RepositoryRoot -Commit $Commit -Path $path) { $paths.Add($path) }
    }
    $migrationJson = @(Invoke-ProductionGit -RepositoryRoot $RepositoryRoot -Arguments @('show', "$Commit`:ops/production/migration-manifest.json")) -join "`n"
    try { $migration = $migrationJson | ConvertFrom-Json -ErrorAction Stop }
    catch { throw 'Frozen Task 1 production contract is not valid JSON.' }
    foreach ($seed in @($migration.seeds)) {
        $seedPath = Assert-ProductionArchiveMemberPath -Path ([string] $seed.path)
        if (-not (Test-ProductionGitTreePath -RepositoryRoot $RepositoryRoot -Commit $Commit -Path $seedPath)) { throw 'Frozen Task 1 production contract has a missing migration seed.' }
        $paths.Add($seedPath)
    }
    return @($paths | Select-Object -Unique)
}

function ConvertTo-ProductionProcessArgument {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $Value)

    return '"' + ($Value -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"'
}

function New-ProductionGitArchiveLock {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string] $Commit,
        [Parameter(Mandatory)] [string[]] $Pathspecs,
        [Parameter(Mandatory)] [string] $ArchivePath
    )

    $stream = [System.IO.File]::Open($ArchivePath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::Read)
    try {
        $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = 'git'
        $startInfo.UseShellExecute = $false
        $startInfo.CreateNoWindow = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $arguments = @('-C', $RepositoryRoot, 'archive', '--format=tar', $Commit, '--') + $Pathspecs
        $startInfo.Arguments = (@($arguments | ForEach-Object { ConvertTo-ProductionProcessArgument -Value $_ }) -join ' ')
        $process = [System.Diagnostics.Process]::new()
        $process.StartInfo = $startInfo
        if (-not $process.Start()) { throw 'Failed to start Git archive.' }
        $process.StandardOutput.BaseStream.CopyTo($stream)
        $errorOutput = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) { throw 'Failed to create Git archive.' }
        $stream.Flush($true)
        $stream.Position = 0
        return $stream
    }
    catch {
        $stream.Dispose()
        throw
    }
}

function New-ProductionRunReservation {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RunsRoot, [Parameter(Mandatory)] [string] $ReleaseId)

    $runRoot = Join-Path $RunsRoot $ReleaseId
    [System.IO.Directory]::CreateDirectory($runRoot) | Out-Null
    try {
        $handle = [System.IO.File]::Open((Join-Path $runRoot 'reservation.lock'), [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
        return [pscustomobject]@{ runRoot = $runRoot; handle = $handle }
    }
    catch { throw 'Production release run already exists or is reserved.' }
}

function Get-ProductionArchiveMembers {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $ArchivePath)

    $detail = @(& tar -tvf $ArchivePath 2>&1)
    if ($LASTEXITCODE -ne 0) { throw 'Failed to enumerate Git archive member types.' }
    foreach ($line in $detail) {
        $entry = [string] $line
        if ([string]::IsNullOrWhiteSpace($entry) -or ($entry[0] -ne '-' -and $entry[0] -ne 'd')) { throw 'Git archive contains a non-regular member.' }
    }
    $members = @(& tar -tf $ArchivePath 2>&1)
    if ($LASTEXITCODE -ne 0) { throw 'Failed to enumerate the Git archive.' }
    $safe = @($members | ForEach-Object {
        $member = ([string] $_).TrimEnd('/')
        Assert-ProductionArchiveMemberPath -Path $member
    })
    if ($safe.Count -eq 0 -or @($safe | Select-Object -Unique).Count -ne $safe.Count) { throw 'Git archive members are invalid.' }
    return $safe
}

function Assert-ProductionReleaseContract {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $SourcePath,
        [Parameter(Mandatory)] [string] $Commit,
        [Parameter(Mandatory)] [string] $ArchiveSha256,
        [Parameter(Mandatory)] [object[]] $Files
    )

    $schemaPath = Join-Path $SourcePath 'ops/production/release-package.schema.json'
    $surfacePath = Join-Path $SourcePath 'ops/production/release-surface.json'
    $migrationPath = Join-Path $SourcePath 'ops/production/migration-manifest.json'
    foreach ($path in @($schemaPath, $surfacePath, $migrationPath)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'Production release contract is incomplete.' }
    }
    try {
        $schema = Get-Content -LiteralPath $schemaPath -Raw | ConvertFrom-Json -ErrorAction Stop
        $surface = Get-Content -LiteralPath $surfacePath -Raw | ConvertFrom-Json -ErrorAction Stop
        $migration = Get-Content -LiteralPath $migrationPath -Raw | ConvertFrom-Json -ErrorAction Stop
    }
    catch { throw 'Production release contract is not valid JSON.' }
    foreach ($entry in $script:FrozenContractSha256.GetEnumerator()) {
        $path = Join-Path $SourcePath ($entry.Key -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        if ((Get-ProductionSha256 -Path $path) -ne $entry.Value) { throw 'Archive does not match the frozen Task 1 production contract.' }
    }
    if ($schema.properties.schemaVersion.const -ne 'tio2-production-release-v1' -or $schema.properties.siteId.const -ne 'tio2-my' -or $surface.schemaVersion -ne 'tio2-my-production-surface-v1' -or $surface.siteId -ne 'tio2-my' -or $migration.schemaVersion -ne 'tio2-my-production-migration-v1' -or $migration.siteId -ne 'tio2-my') {
        throw 'Archive does not match the frozen Task 1 production contract.'
    }
    foreach ($seed in @($migration.seeds)) {
        $relative = Assert-ProductionArchiveMemberPath -Path ([string] $seed.path)
        $candidate = Join-Path $SourcePath ($relative -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf) -or [string] $seed.sha256 -notmatch '^[a-f0-9]{64}$' -or (Get-ProductionSha256 -Path $candidate) -ne $seed.sha256) { throw 'Archive does not match the frozen Task 1 production contract.' }
    }
    foreach ($file in $Files) {
        if ($file.path -notmatch '^(?!/)(?!.*(?:^|/)\.\.(?:/|$)).+$' -or $file.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'Production package manifest file entry is invalid.' }
    }
    if ($Commit -notmatch '^[a-f0-9]{40}$' -or $ArchiveSha256 -notmatch '^[a-f0-9]{64}$') { throw 'Production package identity is invalid.' }
    return [pscustomobject][ordered]@{
        migrationManifestSha256 = Get-ProductionSha256 -Path $migrationPath
        releaseSurfaceSha256 = Get-ProductionSha256 -Path $surfacePath
    }
}

function New-ProductionPackage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string] $OutputRoot,
        [Parameter(Mandatory)] [string] $PrereleaseReceiptPath,
        [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9-]{0,127}$')] [string] $ReleaseId
    )

    $repository = (Resolve-Path -LiteralPath $RepositoryRoot -ErrorAction Stop).Path
    $identity = Get-ProductionGitIdentity -RepositoryRoot $repository
    $candidateEvidence = Assert-ProductionCandidate -GitIdentity $identity -RepositoryRoot $repository -PrereleaseReceiptPath $PrereleaseReceiptPath
    $output = [System.IO.Path]::GetFullPath($OutputRoot)
    $requiredOutput = [System.IO.Path]::GetFullPath((Join-Path $repository '.production'))
    if (-not $output.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar).Equals($requiredOutput.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar), [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Production package output must be the repository .production directory.'
    }
    $runsRoot = Join-Path $output 'runs'
    [System.IO.Directory]::CreateDirectory($runsRoot) | Out-Null
    $releaseId = if ([string]::IsNullOrWhiteSpace($ReleaseId)) { [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + $identity.commit.Substring(0, 12) } else { $ReleaseId }
    $reservation = New-ProductionRunReservation -RunsRoot $runsRoot -ReleaseId $releaseId
    $runRoot = $reservation.runRoot

    $tarPath = Join-Path $runRoot 'source.tar'
    $sourcePath = Join-Path $runRoot 'source'
    $archivePath = Join-Path $runRoot 'release.tar.gz'
    $manifestPath = Join-Path $runRoot 'release-manifest.json'
    try {
        $pathspecs = Get-ProductionArchivePathspecs -RepositoryRoot $repository -Commit $identity.commit
        $archiveLock = New-ProductionGitArchiveLock -RepositoryRoot $repository -Commit $identity.commit -Pathspecs $pathspecs -ArchivePath $tarPath
        try {
            $members = Get-ProductionArchiveMembers -ArchivePath $tarPath
            [System.IO.Directory]::CreateDirectory($sourcePath) | Out-Null
            $extractOutput = @(& tar -xf $tarPath -C $sourcePath 2>&1)
            if ($LASTEXITCODE -ne 0) { throw 'Failed to extract Git archive.' }
            $orderedMembers = [string[]] $members
            [System.Array]::Sort($orderedMembers, [System.StringComparer]::Ordinal)
            $files = foreach ($member in $orderedMembers) {
                $filePath = Join-Path $sourcePath ($member -replace '/', [System.IO.Path]::DirectorySeparatorChar)
                if (Test-Path -LiteralPath $filePath -PathType Leaf) {
                    [pscustomobject][ordered]@{ path = $member; sha256 = Get-ProductionSha256 -Path $filePath }
                }
            }
            $files = @($files)
            if ($files.Count -eq 0) { throw 'Git archive does not contain files.' }
            New-ProductionGzipFile -SourceStream $archiveLock -DestinationPath $archivePath
        }
        finally { $archiveLock.Dispose() }
    }
    finally { $reservation.handle.Dispose() }
    $archiveSha256 = Get-ProductionSha256 -Path $archivePath
    $contract = Assert-ProductionReleaseContract -SourcePath $sourcePath -Commit $identity.commit -ArchiveSha256 $archiveSha256 -Files $files
    $manifest = [ordered]@{
        schemaVersion = 'tio2-production-release-v1'
        siteId = 'tio2-my'
        commit = $identity.commit
        archiveSha256 = $archiveSha256
        files = @($files)
        migrationManifestSha256 = $contract.migrationManifestSha256
        releaseSurfaceSha256 = $contract.releaseSurfaceSha256
    }
    New-ProductionUtf8File -Path $manifestPath -Content ($manifest | ConvertTo-Json -Depth 20 -Compress)
    $manifestSha256 = Get-ProductionSha256 -Path $manifestPath
    # A fixed third upload artifact binds the locally checked evidence to this
    # exact package. This is consistency evidence, not independent authorization.
    $proofPath = Join-Path $runRoot 'release-proof.json'
    $completedAt = if ($candidateEvidence.receipt.completedAt -is [DateTime]) { $candidateEvidence.receipt.completedAt.ToUniversalTime().ToString('o') } else { [string] $candidateEvidence.receipt.completedAt }
    $proof = [ordered]@{
        schemaVersion = 'tio2-production-proof-v1'
        contractVersion = $script:FrozenContractVersion
        siteId = 'tio2-my'; commit = $identity.commit
        archiveSha256 = $archiveSha256; manifestSha256 = $manifestSha256
        source = [ordered]@{ branch = 'main'; clean = $true }
        prerelease = [ordered]@{
            state = 'HEALTHY'; siteId = 'tio2-my'; commit = $identity.commit
            completedAt = $completedAt; buildId = [string] $candidateEvidence.receipt.buildId
            cmsIdentitySha256 = ([string] $candidateEvidence.receipt.cmsIdentitySha256).ToLowerInvariant()
            receiptSha256 = $candidateEvidence.receiptSha256
        }
    }
    New-ProductionUtf8File -Path $proofPath -Content ($proof | ConvertTo-Json -Depth 20 -Compress)
    $proofSha256 = Get-ProductionSha256 -Path $proofPath

    [pscustomobject][ordered]@{
        releaseId = $releaseId; commit = $identity.commit
        archivePath = $archivePath; archiveSha256 = $archiveSha256
        manifestPath = $manifestPath; manifestSha256 = $manifestSha256
        proofPath = $proofPath; proofSha256 = $proofSha256
    }
}

Export-ModuleMember -Function @(
    'Get-ProductionGitIdentity',
    'Assert-ProductionCandidate',
    'Get-ProductionSha256',
    'Assert-ProductionArchiveMemberPath',
    'New-ProductionPackage'
)
