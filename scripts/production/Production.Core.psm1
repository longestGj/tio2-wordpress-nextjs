Set-StrictMode -Version Latest

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
    try { $receipt = Get-Content -LiteralPath $receiptPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop }
    catch { throw 'Prerelease receipt is not valid JSON.' }
    if ($receipt.commit -ne $GitIdentity.commit -or $receipt.siteId -ne 'tio2-my' -or [string]::IsNullOrWhiteSpace([string] $receipt.buildId) -or [string]::IsNullOrWhiteSpace([string] $receipt.cmsIdentitySha256) -or [string] $receipt.cmsIdentitySha256 -notmatch '^[a-fA-F0-9]{64}$') {
        throw 'Prerelease receipt does not contain complete matching commit, site, Build, and CMS identity fields.'
    }
    return [pscustomobject][ordered]@{ git = $GitIdentity; receiptPath = $receiptPath; receipt = $receipt }
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
    param([Parameter(Mandatory)] [string] $SourcePath, [Parameter(Mandatory)] [string] $DestinationPath)

    $input = [System.IO.File]::OpenRead($SourcePath)
    try {
        $output = [System.IO.File]::Open($DestinationPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try {
            $gzip = [System.IO.Compression.GZipStream]::new($output, [System.IO.Compression.CompressionLevel]::Optimal, $true)
            try { $input.CopyTo($gzip) }
            finally { $gzip.Dispose() }
        }
        finally { $output.Dispose() }
    }
    finally { $input.Dispose() }
}

function Get-ProductionArchiveMembers {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $ArchivePath)

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
    if ($schema.properties.schemaVersion.const -ne 'tio2-production-release-v1' -or $schema.properties.siteId.const -ne 'tio2-my' -or $surface.schemaVersion -ne 'tio2-my-production-surface-v1' -or $surface.siteId -ne 'tio2-my' -or $migration.schemaVersion -ne 'tio2-my-production-migration-v1' -or $migration.siteId -ne 'tio2-my') {
        throw 'Production release contract does not match tio2-my.'
    }
    foreach ($seed in @($migration.seeds)) {
        $relative = Assert-ProductionArchiveMemberPath -Path ([string] $seed.path)
        $candidate = Join-Path $SourcePath ($relative -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf) -or [string] $seed.sha256 -notmatch '^[a-f0-9]{64}$' -or (Get-ProductionSha256 -Path $candidate) -ne $seed.sha256) { throw 'Production migration manifest does not match the Git archive.' }
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
        [Parameter(Mandatory)] [string] $PrereleaseReceiptPath
    )

    $repository = (Resolve-Path -LiteralPath $RepositoryRoot -ErrorAction Stop).Path
    $identity = Get-ProductionGitIdentity -RepositoryRoot $repository
    $null = Assert-ProductionCandidate -GitIdentity $identity -RepositoryRoot $repository -PrereleaseReceiptPath $PrereleaseReceiptPath
    $output = [System.IO.Path]::GetFullPath($OutputRoot)
    $requiredOutput = [System.IO.Path]::GetFullPath((Join-Path $repository '.production'))
    if (-not $output.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar).Equals($requiredOutput.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar), [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Production package output must be the repository .production directory.'
    }
    $runsRoot = Join-Path $output 'runs'
    [System.IO.Directory]::CreateDirectory($runsRoot) | Out-Null
    $releaseId = [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + $identity.commit.Substring(0, 12)
    $runRoot = Join-Path $runsRoot $releaseId
    if (Test-Path -LiteralPath $runRoot) { throw 'Production release run already exists.' }
    [System.IO.Directory]::CreateDirectory($runRoot) | Out-Null

    $tarPath = Join-Path $runRoot 'source.tar'
    $sourcePath = Join-Path $runRoot 'source'
    $archivePath = Join-Path $runRoot 'release.tar.gz'
    $manifestPath = Join-Path $runRoot 'release-manifest.json'
    $archiveOutput = @(& git -C $repository archive --format=tar --output=$tarPath $identity.commit 2>&1)
    if ($LASTEXITCODE -ne 0) { throw 'Failed to create Git archive.' }
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
    New-ProductionGzipFile -SourcePath $tarPath -DestinationPath $archivePath
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

    [pscustomobject][ordered]@{
        releaseId = $releaseId; commit = $identity.commit
        archivePath = $archivePath; archiveSha256 = $archiveSha256
        manifestPath = $manifestPath; manifestSha256 = $manifestSha256
    }
}

Export-ModuleMember -Function @(
    'Get-ProductionGitIdentity',
    'Assert-ProductionCandidate',
    'Get-ProductionSha256',
    'Assert-ProductionArchiveMemberPath',
    'New-ProductionPackage'
)
