Set-StrictMode -Version Latest

# This version names an immutable reviewed hash tuple, mirrored by the installed
# Python policy. Contract edits require a new version and administrator upgrade.
$script:FrozenContractVersion = 'tio2-production-contracts-v2'
$script:FrozenContractSha256 = [ordered]@{
    'ops/production/release-package.schema.json' = 'ad8dbea67cb5c7c4a8503e830b32a061ee46859c3992e0570cc42d4d38362346'
    'ops/production/release-surface.json' = '42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152'
    'ops/production/migration-manifest.json' = '8bc0db54ef1efe5ceff3474e0efc29d0696e6256ed1b9d59d141aed7ce3c1004'
}

$script:ProductionRuntimePaths = @(
    '.env.example', '.gitattributes', 'next.config.ts', 'package.json', 'package-lock.json', 'proxy.ts', 'tsconfig.json', 'vercel.json',
    'app', 'components', 'content', 'lib', 'public', 'sites', 'wordpress/bootstrap', 'wordpress/plugins', 'ops/production'
)

$script:FrontendRuntimePaths = @(
    '.env.example', '.gitattributes', 'next.config.ts', 'package.json', 'package-lock.json', 'proxy.ts', 'tsconfig.json', 'vercel.json',
    'app', 'components', 'lib', 'public', 'sites'
)
$script:InstalledCandidateAdapters = @('tio2-my/frontend-only')

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

function Read-ProductionJsonStrict {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $Path)

    $parser = @'
import json, sys
def reject_duplicates(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError("duplicate JSON member")
        value[key] = item
    return value
with open(sys.argv[1], "r", encoding="utf-8-sig") as stream:
    value = json.load(stream, object_pairs_hook=reject_duplicates)
sys.stdout.write(json.dumps(value, separators=(",", ":"), ensure_ascii=False))
'@
    $parserPath = [IO.Path]::GetTempFileName() + '.py'
    try {
        [IO.File]::WriteAllText($parserPath, $parser, [Text.UTF8Encoding]::new($false))
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $normalized = @(& python $parserPath $Path 2>$null)
            $parserExit = $LASTEXITCODE
        }
        finally { $ErrorActionPreference = $previousPreference }
    }
    finally {
        Remove-Item -LiteralPath $parserPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath ($parserPath -replace '\.py$', '') -Force -ErrorAction SilentlyContinue
    }
    if ($parserExit -ne 0 -or $normalized.Count -ne 1) { throw 'Prerelease receipt is not valid strict JSON.' }
    try { return ($normalized[0] | ConvertFrom-Json -ErrorAction Stop) }
    catch { throw 'Prerelease receipt is not valid strict JSON.' }
}

function Assert-ProductionCandidate {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [object] $GitIdentity,
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string] $PrereleaseReceiptPath
    )

    if (@($GitIdentity.entries).Count -ne 0) { throw 'Production packaging requires a clean candidate worktree.' }
    if ($GitIdentity.commit -notmatch '^[a-f0-9]{40}$') { throw 'Production packaging requires a valid Git commit.' }
    $receiptPath = Assert-ProductionReceiptPath -RepositoryRoot $RepositoryRoot -PrereleaseReceiptPath $PrereleaseReceiptPath
    $receiptBytes = [System.IO.File]::ReadAllBytes($receiptPath)
    $receipt = Read-ProductionJsonStrict -Path $receiptPath
    try {
        $expectedKeys = @('buildId','cmsIdentitySha256','commit','counts','evidenceSha256','forms','previousProductionReceipt','releaseSurfaceSha256','runId','schemaVersion','sealedAt','siteId','state') | Sort-Object
        $actualKeys = @($receipt.PSObject.Properties.Name | Sort-Object)
        $sealedAtText = if ($receipt.sealedAt -is [DateTime]) { $receipt.sealedAt.ToUniversalTime().ToString('o') } else { [string] $receipt.sealedAt }
        $sealedAt = [DateTimeOffset]::MinValue
        if (@(Compare-Object $actualKeys $expectedKeys -CaseSensitive).Count -ne 0 -or
            $receipt.schemaVersion -cne 'tio2-prerelease-production-gate-v1' -or $receipt.state -cne 'PASSED' -or
            $receipt.commit -cne $GitIdentity.commit -or $receipt.siteId -cne 'tio2-my' -or
            [string]::IsNullOrWhiteSpace([string] $receipt.runId) -or [string]::IsNullOrWhiteSpace([string] $receipt.buildId) -or [string]::IsNullOrWhiteSpace([string] $receipt.previousProductionReceipt) -or
            $receipt.cmsIdentitySha256 -notmatch '^[a-f0-9]{64}$' -or $receipt.releaseSurfaceSha256 -cne $script:FrozenContractSha256['ops/production/release-surface.json'] -or
            $sealedAtText -notmatch '(Z|[+-][0-9]{2}:[0-9]{2})$' -or -not [DateTimeOffset]::TryParse($sealedAtText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind, [ref] $sealedAt) -or
            $receipt.counts.businessPages -ne 56 -or $receipt.counts.registeredObjects -ne 58 -or $receipt.counts.widths -ne 3 -or $receipt.counts.browserCases -ne 174 -or
            $receipt.forms.rfq -cne 'RECEIVED' -or $receipt.forms.sample -cne 'RECEIVED' -or $receipt.forms.documents -cne 'RECEIVED' -or
            $receipt.evidenceSha256.test -notmatch '^[a-f0-9]{64}$' -or $receipt.evidenceSha256.liveForms -notmatch '^[a-f0-9]{64}$' -or $receipt.evidenceSha256.inbox -notmatch '^[a-f0-9]{64}$') {
            throw 'invalid'
        }
        if (@(Compare-Object @($receipt.counts.PSObject.Properties.Name | Sort-Object) @('browserCases','businessPages','registeredObjects','widths') -CaseSensitive).Count -ne 0 -or
            @(Compare-Object @($receipt.forms.PSObject.Properties.Name | Sort-Object) @('documents','rfq','sample') -CaseSensitive).Count -ne 0 -or
            @(Compare-Object @($receipt.evidenceSha256.PSObject.Properties.Name | Sort-Object) @('inbox','liveForms','test') -CaseSensitive).Count -ne 0) { throw 'invalid' }
    }
    catch { throw 'Exact production prerelease gate is not satisfied.' }
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
        $arguments = @('-C', $RepositoryRoot, '-c', 'core.autocrlf=false', 'archive', '--format=tar', $Commit, '--') + $Pathspecs
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
    $lockPath = Join-Path $RunsRoot (".$ReleaseId.lock")
    try {
        $handle = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    }
    catch { throw 'Production release run already exists or is reserved.' }
    try {
        if (Test-Path -LiteralPath $runRoot) { throw 'Production release run already exists or is reserved.' }
        [System.IO.Directory]::CreateDirectory($runRoot) | Out-Null
        return [pscustomobject]@{ runRoot = $runRoot; handle = $handle }
    }
    catch {
        $handle.Dispose()
        throw
    }
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

function Get-ProductionRelativeRepositoryPath {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot, [Parameter(Mandatory)] [string] $Path)

    $repository = [System.IO.Path]::GetFullPath($RepositoryRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $resolved = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
    $prefix = $repository + [System.IO.Path]::DirectorySeparatorChar
    if (-not $resolved.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Development receipt must be inside the repository.' }
    $relative = $resolved.Substring($prefix.Length).Replace([System.IO.Path]::DirectorySeparatorChar, '/')
    return Assert-ProductionArchiveMemberPath -Path $relative
}

function Get-ProductionCandidateChanges {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot, [Parameter(Mandatory)] [string] $Commit)

    Invoke-ProductionGit -RepositoryRoot $RepositoryRoot -Arguments @('rev-parse', '--verify', 'main^{commit}') | Out-Null
    $changes = @(Invoke-ProductionGit -RepositoryRoot $RepositoryRoot -Arguments @('diff', '--name-only', '--diff-filter=ACDMRTUXB', "main..$Commit", '--') | ForEach-Object {
        Assert-ProductionArchiveMemberPath -Path ([string] $_)
    })
    if ($changes.Count -eq 0) { throw 'main..candidate does not contain release changes.' }
    return @($changes | Sort-Object -Unique -CaseSensitive)
}

function ConvertTo-ProductionStringSet {
    [CmdletBinding()]
    param([object] $Value, [switch] $Paths)

    $result = @()
    foreach ($item in @($Value)) {
        if ($item -isnot [string] -or [string]::IsNullOrWhiteSpace($item)) { throw 'Development receipt is invalid.' }
        $text = [string] $item
        if ($Paths) { $text = Assert-ProductionArchiveMemberPath -Path $text }
        $result += $text
    }
    return @($result | Sort-Object -Unique -CaseSensitive)
}

function Get-ProductionRegisteredSites {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot, [Parameter(Mandatory)] [string] $Commit)

    $text = @(Invoke-ProductionGit -RepositoryRoot $RepositoryRoot -Arguments @('show', "$Commit`:docs/site-registry.md")) -join "`n"
    $sites = @([regex]::Matches($text, '(?m)^\|\s*`(?<site>[A-Za-z0-9][A-Za-z0-9._-]{0,127})`\s*\|') | ForEach-Object { $_.Groups['site'].Value } | Sort-Object -Unique -CaseSensitive)
    if ($sites.Count -eq 0) { throw 'Site registry does not contain release consumers.' }
    return $sites
}

function Get-ProductionDevelopmentEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string] $Commit,
        [Parameter(Mandatory)] [string[]] $ChangedPaths,
        [Parameter(Mandatory)] [string[]] $DevelopmentReceiptPath
    )

    $expectedKeys = @('affectedConsumers','cmsContractChanged','contentScopes','hostPaths','mergeCommit','paths','receiptId','schemaVersion','state','subjects') | Sort-Object
    $registered = @(Get-ProductionRegisteredSites -RepositoryRoot $RepositoryRoot -Commit $Commit)
    $receiptGitPaths = @()
    $covered = @()
    $receiptIds = @()
    $siteIds = @()
    $affectedConsumers = @()
    $contentScopes = @()
    $hostPaths = @()
    $cmsContractChanged = $false
    $receipts = @()

    foreach ($path in @($DevelopmentReceiptPath)) {
        $relative = Get-ProductionRelativeRepositoryPath -RepositoryRoot $RepositoryRoot -Path $path
        if (-not $relative.StartsWith('docs/verification/development-receipts/', [System.StringComparison]::Ordinal)) { throw 'Development receipt path is not approved.' }
        Invoke-ProductionGit -RepositoryRoot $RepositoryRoot -Arguments @('cat-file', '-e', "$Commit`:$relative") | Out-Null
        try { $receipt = Read-ProductionJsonStrict -Path $path }
        catch { throw 'Development receipt is invalid.' }
        $actualKeys = @($receipt.PSObject.Properties.Name | Sort-Object)
        if (@(Compare-Object $actualKeys $expectedKeys -CaseSensitive).Count -ne 0 -or
            $receipt.schemaVersion -cne 'd16-development-receipt-v1' -or $receipt.state -cne 'MERGED_TO_DEVELOP' -or
            $receipt.receiptId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$' -or $receipt.mergeCommit -notmatch '^[a-f0-9]{40}$' -or
            $receipt.cmsContractChanged -isnot [bool]) { throw 'Development receipt is invalid.' }
        & git -C $RepositoryRoot merge-base --is-ancestor ([string] $receipt.mergeCommit) $Commit
        if ($LASTEXITCODE -ne 0) { throw 'Development receipt commit is outside the frozen candidate.' }
        $paths = @(ConvertTo-ProductionStringSet -Value $receipt.paths -Paths)
        $subjects = @(ConvertTo-ProductionStringSet -Value $receipt.subjects)
        $consumers = @(ConvertTo-ProductionStringSet -Value $receipt.affectedConsumers)
        $scopes = @(ConvertTo-ProductionStringSet -Value $receipt.contentScopes)
        $receiptHostPaths = @(ConvertTo-ProductionStringSet -Value $receipt.hostPaths -Paths)
        foreach ($site in @($subjects + $consumers + $scopes | Sort-Object -Unique -CaseSensitive)) {
            if ($site -in @('host','cms')) { continue }
            if ($site -notin $registered) { throw 'Development receipt consumer is not registered.' }
        }
        $receiptGitPaths += $relative
        $covered += $paths
        $receiptIds += [string] $receipt.receiptId
        $siteIds += @($subjects | Where-Object { $_ -notin @('host','cms') })
        $siteIds += $consumers
        $affectedConsumers += $consumers
        $contentScopes += $scopes
        $hostPaths += $receiptHostPaths
        $cmsContractChanged = $cmsContractChanged -or [bool] $receipt.cmsContractChanged
        $receipts += [pscustomobject][ordered]@{ receiptId = [string] $receipt.receiptId; path = $relative; sha256 = Get-ProductionSha256 -Path $path }
    }

    $releaseChanges = @($ChangedPaths | Where-Object { $_ -notin $receiptGitPaths } | Sort-Object -Unique -CaseSensitive)
    $coveredChanges = @($covered | Where-Object { $_ -in $releaseChanges } | Sort-Object -Unique -CaseSensitive)
    if ($releaseChanges.Count -eq 0 -or @(Compare-Object $releaseChanges $coveredChanges -CaseSensitive).Count -ne 0) {
        throw 'Development receipts do not cover main..candidate changes.'
    }
    if (@($covered | Where-Object { $_ -notin $releaseChanges }).Count -ne 0) { throw 'Development receipt covers paths outside main..candidate.' }
    $sharedRuntime = @($releaseChanges | Where-Object { $_ -match '^(app|components|lib|public)/' })
    if ($sharedRuntime.Count -gt 0 -and $affectedConsumers.Count -eq 0) { throw 'Development receipt does not identify registered shared runtime consumers.' }

    return [pscustomobject][ordered]@{
        gitPaths = $releaseChanges
        siteIds = @($siteIds | Sort-Object -Unique -CaseSensitive)
        contentScopes = @($contentScopes | Sort-Object -Unique -CaseSensitive)
        cmsContractChanged = $cmsContractChanged
        hostPaths = @($hostPaths | Sort-Object -Unique -CaseSensitive)
        receiptIds = @($receiptIds | Sort-Object -Unique -CaseSensitive)
        receipts = @($receipts | Sort-Object receiptId)
        registeredSites = $registered
    }
}

function Get-ProductionContentScopes {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot, [string[]] $ContentManifestPath, [string[]] $RegisteredSites)

    $scopes = @()
    foreach ($path in @($ContentManifestPath)) {
        try { Assert-ProductionReceiptPath -RepositoryRoot $RepositoryRoot -PrereleaseReceiptPath $path | Out-Null }
        catch { throw 'Content manifest path must be below .prerelease/runs.' }
        try { $manifest = Read-ProductionJsonStrict -Path $path }
        catch { throw 'Content manifest is invalid.' }
        if (@(Compare-Object @($manifest.PSObject.Properties.Name | Sort-Object) @('schemaVersion','siteScope') -CaseSensitive).Count -ne 0 -or
            $manifest.schemaVersion -cne 'd16-content-manifest-v1' -or $manifest.siteScope -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$') {
            throw 'Content manifest is invalid.'
        }
        if ([string] $manifest.siteScope -notin $RegisteredSites) { throw 'Content manifest scope is not registered.' }
        $scopes += [string] $manifest.siteScope
    }
    return @($scopes | Sort-Object -Unique -CaseSensitive)
}

function Invoke-ProductionReleaseClassifier {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot, [Parameter(Mandatory)] [object] $Evidence)

    $classifierPath = Join-Path $RepositoryRoot 'ops/production/server/release_classifier.py'
    if (-not (Test-Path -LiteralPath $classifierPath -PathType Leaf)) { throw 'Release classifier is unavailable.' }
    $inputPath = Join-Path ([System.IO.Path]::GetTempPath()) ("d16-classifier-$([guid]::NewGuid().ToString('N')).json")
    try {
        $value = [ordered]@{
            git_paths = @($Evidence.gitPaths)
            site_ids = @($Evidence.siteIds)
            content_scopes = @($Evidence.contentScopes)
            cms_contract_changed = [bool] $Evidence.cmsContractChanged
            host_paths = @($Evidence.hostPaths)
            receipt_ids = @($Evidence.receiptIds)
        }
        New-ProductionUtf8File -Path $inputPath -Content ($value | ConvertTo-Json -Depth 20 -Compress)
        $output = @(& python $classifierPath --json $inputPath 2>$null)
        if ($LASTEXITCODE -ne 0 -or $output.Count -ne 1) { throw 'unclassified release change' }
        try {
            $decoded = $output[0] | ConvertFrom-Json -ErrorAction Stop
            if (@($decoded.PSObject.Properties.Name) -notcontains 'units') { throw 'invalid' }
            return [pscustomobject]@{ units = @($decoded.units) }
        }
        catch { throw 'unclassified release change' }
    }
    finally { Remove-Item -LiteralPath $inputPath -Force -ErrorAction SilentlyContinue }
}

function Get-ProductionFrontendPathspecs {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $RepositoryRoot, [Parameter(Mandatory)] [string] $Commit)

    $paths = @()
    foreach ($path in $script:FrontendRuntimePaths) {
        if (Test-ProductionGitTreePath -RepositoryRoot $RepositoryRoot -Commit $Commit -Path $path) { $paths += $path }
    }
    if ($paths.Count -eq 0) { throw 'Frontend payload does not contain runtime files.' }
    return @($paths | Sort-Object -Unique -CaseSensitive)
}

function Get-ProductionTextSha256 {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [string] $Text)

    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Text)
        return ([System.BitConverter]::ToString($algorithm.ComputeHash($bytes)) -replace '-', '').ToLowerInvariant()
    }
    finally { $algorithm.Dispose() }
}

function New-ProductionPackage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $RepositoryRoot,
        [Parameter(Mandatory)] [string] $OutputRoot,
        [Parameter(Mandatory)] [string] $PrereleaseReceiptPath,
        [Parameter(Mandatory)] [string[]] $DevelopmentReceiptPath,
        [string[]] $ContentManifestPath = @(),
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

    $changes = @(Get-ProductionCandidateChanges -RepositoryRoot $repository -Commit $identity.commit)
    $evidence = Get-ProductionDevelopmentEvidence -RepositoryRoot $repository -Commit $identity.commit -ChangedPaths $changes -DevelopmentReceiptPath $DevelopmentReceiptPath
    $manifestScopes = @(Get-ProductionContentScopes -RepositoryRoot $repository -ContentManifestPath $ContentManifestPath -RegisteredSites $evidence.registeredSites)
    $evidence.contentScopes = @($evidence.contentScopes + $manifestScopes | Sort-Object -Unique -CaseSensitive)
    $classification = Invoke-ProductionReleaseClassifier -RepositoryRoot $repository -Evidence $evidence
    $units = @($classification.units)
    if ($units.Count -ne 1) { throw 'campaign-required: candidate contains multiple release units.' }
    $unit = $units[0]
    $adapter = "$($unit.subject)/$($unit.release_type)"
    if ($adapter -notin $script:InstalledCandidateAdapters) { throw "Release adapter is not installed: $($unit.release_type)" }

    $runsRoot = Join-Path $output 'runs'
    [System.IO.Directory]::CreateDirectory($runsRoot) | Out-Null
    $releaseId = if ([string]::IsNullOrWhiteSpace($ReleaseId)) { [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + $identity.commit.Substring(0, 12) } else { $ReleaseId }
    $reservation = New-ProductionRunReservation -RunsRoot $runsRoot -ReleaseId $releaseId
    $runRoot = $reservation.runRoot

    $tarPath = Join-Path $runRoot '.payload-source.tar'
    $payloadPath = Join-Path $runRoot 'payload'
    $frontendPath = Join-Path $payloadPath 'frontend'
    $manifestPath = Join-Path $runRoot 'candidate-manifest.json'
    $proofPath = Join-Path $runRoot 'prerelease-proof.json'
    $checksumsPath = Join-Path $runRoot 'checksums.json'
    try {
        [System.IO.Directory]::CreateDirectory($frontendPath) | Out-Null
        $pathspecs = Get-ProductionFrontendPathspecs -RepositoryRoot $repository -Commit $identity.commit
        $archiveLock = New-ProductionGitArchiveLock -RepositoryRoot $repository -Commit $identity.commit -Pathspecs $pathspecs -ArchivePath $tarPath
        try {
            $members = Get-ProductionArchiveMembers -ArchivePath $tarPath
            $extractOutput = @(& tar -xf $tarPath -C $frontendPath 2>&1)
            if ($LASTEXITCODE -ne 0) { throw 'Failed to extract Git archive.' }
            $orderedMembers = [string[]] $members
            [System.Array]::Sort($orderedMembers, [System.StringComparer]::Ordinal)
            $files = foreach ($member in $orderedMembers) {
                $filePath = Join-Path $frontendPath ($member -replace '/', [System.IO.Path]::DirectorySeparatorChar)
                if (Test-Path -LiteralPath $filePath -PathType Leaf) {
                    [pscustomobject][ordered]@{ path = "frontend/$member"; sha256 = Get-ProductionSha256 -Path $filePath }
                }
            }
            $files = @($files)
            if ($files.Count -eq 0) { throw 'Frontend payload does not contain files.' }
        }
        finally { $archiveLock.Dispose() }
        Remove-Item -LiteralPath $tarPath -Force

        $payloadCanonical = @($files | ForEach-Object { "$($_.sha256)  $($_.path)`n" }) -join ''
        $payloadSha256 = Get-ProductionTextSha256 -Text $payloadCanonical
        $configurationPath = Join-Path $repository 'docs/site-registry.md'
        $configurationSha256 = Get-ProductionSha256 -Path $configurationPath
        $createdAt = [DateTimeOffset]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffffffZ')
        $manifest = [ordered]@{
            schemaVersion = 'd16-release-candidate-v1'
            releaseId = $releaseId
            subject = [string] $unit.subject
            releaseType = [string] $unit.release_type
            sourceCommit = $identity.commit
            buildId = [string] $candidateEvidence.receipt.buildId
            createdAt = $createdAt
            previousProductionReceipt = [string] $candidateEvidence.receipt.previousProductionReceipt
            cmsContractSha256 = ([string] $candidateEvidence.receipt.cmsIdentitySha256).ToLowerInvariant()
            configurationSha256 = $configurationSha256
            prereleaseReceiptSha256 = $candidateEvidence.receiptSha256
            payloadSha256 = $payloadSha256
            files = @($files)
        }
        New-ProductionUtf8File -Path $manifestPath -Content ($manifest | ConvertTo-Json -Depth 20 -Compress)
        $manifestSha256 = Get-ProductionSha256 -Path $manifestPath

        $sealedAt = if ($candidateEvidence.receipt.sealedAt -is [DateTime]) { $candidateEvidence.receipt.sealedAt.ToUniversalTime().ToString('o') } else { [string] $candidateEvidence.receipt.sealedAt }
        $proof = [ordered]@{
            schemaVersion = 'd16-prerelease-proof-v1'
            subject = [string] $unit.subject
            releaseType = [string] $unit.release_type
            source = [ordered]@{ base = 'main'; branch = [string] $identity.branch; candidateCommit = $identity.commit; clean = $true }
            prerelease = [ordered]@{
                state = 'PASSED'; siteId = [string] $candidateEvidence.receipt.siteId; commit = $identity.commit
                runId = [string] $candidateEvidence.receipt.runId; sealedAt = $sealedAt
                buildId = [string] $candidateEvidence.receipt.buildId
                productionGateReceiptSha256 = $candidateEvidence.receiptSha256
            }
            developmentReceipts = @($evidence.receipts)
        }
        New-ProductionUtf8File -Path $proofPath -Content ($proof | ConvertTo-Json -Depth 20 -Compress)
        $proofSha256 = Get-ProductionSha256 -Path $proofPath

        $checksumFiles = @(
            [pscustomobject][ordered]@{ path = 'candidate-manifest.json'; sha256 = $manifestSha256 }
            @($files | ForEach-Object { [pscustomobject][ordered]@{ path = "payload/$($_.path)"; sha256 = $_.sha256 } })
            [pscustomobject][ordered]@{ path = 'prerelease-proof.json'; sha256 = $proofSha256 }
        )
        $checksums = [ordered]@{ schemaVersion = 'd16-release-checksums-v1'; files = $checksumFiles }
        New-ProductionUtf8File -Path $checksumsPath -Content ($checksums | ConvertTo-Json -Depth 20 -Compress)
        $checksumsSha256 = Get-ProductionSha256 -Path $checksumsPath
    }
    finally { $reservation.handle.Dispose() }

    [pscustomobject][ordered]@{
        releaseId = $releaseId; subject = [string] $unit.subject; releaseType = [string] $unit.release_type; commit = $identity.commit
        manifestPath = $manifestPath; manifestSha256 = $manifestSha256
        proofPath = $proofPath; proofSha256 = $proofSha256
        checksumsPath = $checksumsPath; checksumsSha256 = $checksumsSha256
        payloadPath = $payloadPath; payloadSha256 = $payloadSha256
    }
}

Export-ModuleMember -Function @(
    'Get-ProductionGitIdentity',
    'Assert-ProductionCandidate',
    'Get-ProductionSha256',
    'Assert-ProductionArchiveMemberPath',
    'New-ProductionPackage'
)

# Local controller. Transport and recovery boundaries are module functions so
# isolated tests can substitute them without adding a CLI bypass.
function Read-ProductionJson($Path) { Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable }
function Save-ProductionJson($Path, $Value) {
    $temporary = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($Value | ConvertTo-Json -Depth 50 -Compress))
    $stream = [IO.File]::Open($temporary, 'CreateNew', 'Write', 'None')
    try { $stream.Write($bytes); $stream.Flush($true) } finally { $stream.Dispose() }
    [IO.File]::Move($temporary, $Path, $true)
}
function Assert-ProductionConnection($Config) {
    try {
        if ($Config.siteId -ne 'tio2-my' -or $Config.username -ne 'deploy' -or $Config.host -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]*$' -or $Config.port -lt 1 -or $Config.port -gt 65535 -or $Config.baselineSha256 -notmatch '^[a-f0-9]{64}$') { throw 'invalid' }
        if ($Config.hostKey -notmatch '^ssh-ed25519 ([A-Za-z0-9+/]+={0,2})$') { throw 'invalid' }
        $key = [Convert]::FromBase64String($Matches[1])
        if ($key.Length -ne 51 -or [Text.Encoding]::ASCII.GetString($key,4,11) -ne 'ssh-ed25519') { throw 'invalid' }
        if (-not (Test-Path -LiteralPath $Config.identityFile -PathType Leaf)) { throw 'invalid' }
    } catch { throw 'Production connection identity is missing or invalid.' }
}
function Assert-ProductionActionReceipt($Action, $Receipt, $Candidate) {
    try {
        if ($Receipt.action -cne $Action -or $Receipt.ok -isnot [bool] -or $Receipt.ok -ne $true) { throw 'invalid' }
        $states = @{prepare=@('PREPARED');backup=@('BACKED_UP');deploy=@('INTERNAL_VERIFIED','PUBLIC_VERIFIED');verify=@('PUBLIC_VERIFIED','ROLLED_BACK');rollback=@('ROLLED_BACK')}
        if ($Action -in @('deploy','verify','rollback') -and ($Receipt.databaseRestored -isnot [bool] -or $Receipt.databaseRestored -ne $false)) { throw 'invalid' }
        if ($Action -eq 'status') { if ($Receipt.state.state -notin @('IDLE','PREPARED','BACKED_UP','DEPLOYING','INTERNAL_VERIFIED','PUBLIC_VERIFIED','FAILED','ROLLING_BACK','ROLLED_BACK')) { throw 'invalid' } }
        elseif ($Receipt.state -notin $states[$Action]) { throw 'invalid' }
        if ($null -ne $Candidate -and $Action -ne 'backup') {
            $observed = if ($Action -eq 'status') { $Receipt.state.details.candidate } else { $Receipt.candidate }
            foreach ($name in @('commit','archiveSha256','manifestSha256','proofSha256')) { if ($observed[$name] -cne $Candidate[$name]) { throw 'invalid' } }
        }
    } catch { throw 'Production action receipt identity or state mismatch.' }
}
function Get-ProductionBackupRequest($RunRoot, $ProofSha256, $BaselineSha256) {
    $path = Join-Path $RunRoot 'backup-request.json'
    if (Test-Path -LiteralPath $path) {
        $request = Read-ProductionJson $path
        if ($request.schemaVersion -ne 'tio2-backup-request-v1' -or $request.preparedProofSha256 -cne $ProofSha256 -or $request.baselineSha256 -cne $BaselineSha256 -or $request.requestId -notmatch '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$') { throw 'Persisted backup request identity mismatch.' }
        return $request
    }
    $request = [ordered]@{schemaVersion='tio2-backup-request-v1'; requestId=[guid]::NewGuid().ToString();preparedProofSha256=$ProofSha256;baselineSha256=$BaselineSha256}
    Save-ProductionJson $path $request
    return $request
}
function Invoke-ProductionTransport($Config, $RunRoot, $Kind, $Value, $Intent = $null) {
    Assert-ProductionConnection $Config
    $known = Join-Path $RunRoot 'known_hosts'
    $lookup = if ($Config.port -eq 22) { $Config.host } else { "[$($Config.host)]:$($Config.port)" }
    $line = "$lookup $($Config.hostKey)`n"
    # A dedicated pin file is rebuilt from the operator-enrolled public key;
    # never trust ssh-keyscan or the user's global SSH config/known_hosts.
    [IO.File]::WriteAllText($known, $line, [Text.UTF8Encoding]::new($false))
    $options = @('-F','none','-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$known",'-o','GlobalKnownHostsFile=none','-o','ConnectTimeout=15','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3','-i',$Config.identityFile)
    $destination = "deploy@$($Config.host)"
    if ($Kind -eq 'action') {
        if ($Value -notin @('status','prepare','backup','deploy','verify','rollback')) { throw 'Unsupported fixed action.' }
        if ($Value -eq 'rollback') {
            if ($null -eq $Intent) { throw 'Rollback requires a bound operation intent.' }
            $output = @(($Intent | ConvertTo-Json -Depth 10 -Compress) | & ssh @options -p $Config.port $destination "sudo -n /usr/local/sbin/tio2-release $Value" 2>$null)
        } else {
            $output = @(& ssh @options -p $Config.port $destination "sudo -n /usr/local/sbin/tio2-release $Value" 2>$null)
        }
        if ($LASTEXITCODE -ne 0) {
            $failure=@{action=$Value;exitCode=$LASTEXITCODE;completed=$false;observedAt=[DateTimeOffset]::UtcNow.ToString('o')}
            try {
                $remoteError=($output -join "`n")|ConvertFrom-Json -AsHashtable
                if($remoteError.error -in @('release error','internal release error')){$failure.returnedError=$remoteError.error}
            } catch {}
            Save-ProductionJson (Join-Path $RunRoot 'transport-failure.json') $failure
            if($Value -ne 'status'){
                try {
                    $observed=Invoke-ProductionTransport $Config $RunRoot action status
                    Assert-ProductionActionReceipt status $observed $null
                    Save-ProductionJson (Join-Path $RunRoot 'failure-status.json') $observed
                } catch {}
            }
            throw 'Remote action failed or disconnected; retry this same run.'
        }
        try { return (($output -join "`n") | ConvertFrom-Json -AsHashtable -ErrorAction Stop) } catch { throw 'Remote action receipt is not JSON.' }
    }
    if ($Kind -eq 'upload') {
        if ($Value -notin @('release.tar.gz','release-manifest.json','release-proof.json','backup-request.json','deployment-evidence.json')) { throw 'Unsupported upload.' }
        & scp @options -P $Config.port (Join-Path $RunRoot $Value) "${destination}:/home/deploy/tio2-incoming/$Value" 2>$null | Out-Null
    } elseif ($Kind -eq 'download') {
        if ($Value -notmatch '^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{40}-[a-f0-9]{32}$') { throw 'Invalid backup ID.' }
        & scp @options -P $Config.port "${destination}:/home/deploy/tio2-outgoing/$Value.tar.age" (Join-Path $RunRoot 'ciphertext.age.part') 2>$null | Out-Null
    } else { throw 'Unsupported transport.' }
    if ($LASTEXITCODE -ne 0) { throw 'Transfer failed or disconnected; retry this same run.' }
}
function Invoke-ProductionRecovery($Config,$RunRoot) {
    if ($Config.recoveryImageId -notmatch '^sha256:[a-f0-9]{64}$' -or $Config.dockerContext -notmatch '^[A-Za-z0-9_-]+$' -or -not (Test-Path -LiteralPath $Config.ageIdentityFile -PathType Leaf)) { throw 'Local Linux recovery configuration is required.' }
    $helper = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../ops/production'))
    $diagnostic=@(& docker --context $Config.dockerContext run --rm --network none --label "tio2.client-recovery=$([IO.Path]::GetFileName($RunRoot))" --env "TIO2_RECOVERY_IMAGE=$($Config.recoveryImageId)" --mount "type=bind,source=$RunRoot,target=/run-evidence" --mount "type=bind,source=$($Config.ageIdentityFile),target=/identity.age,readonly" --mount "type=bind,source=$helper,target=/tooling,readonly" --mount 'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock' --entrypoint python3 $Config.recoveryImageId -B /tooling/client_recovery.py 2>&1)
    $recoveryExit=$LASTEXITCODE
    [IO.File]::WriteAllText((Join-Path $RunRoot 'recovery.log'),($diagnostic -join "`n"))
    if ($recoveryExit -ne 0) { throw 'Local decryption/restore verification failed; no deployment evidence was issued.' }
}
function New-ProductionDeploymentEvidence($RunRoot,$Prepared,$Backup) {
    try {
        $decrypt=Read-ProductionJson (Join-Path $RunRoot 'decryption.json'); $restore=Read-ProductionJson (Join-Path $RunRoot 'restore.json')
        foreach ($item in @($decrypt,$restore)) {
            if ($item.verified -isnot [bool] -or $item.verified -ne $true -or $item.backupId -cne $Backup.backupId -or $item.ciphertextSha256 -cne $Backup.ciphertextSha256 -or $item.manifestSha256 -cne $Backup.manifestSha256) { throw 'invalid' }
        }
        foreach ($flag in @('uid33PluginLoaded','databaseReadback','wordpressBytesVerified','cleanupVerified')) { if ($restore[$flag] -isnot [bool] -or $restore[$flag] -ne $true) { throw 'invalid' } }
        if ($restore.permissionPolicy -ne 'tio2-ro-plugin-root-v1' -or $restore.uid33PluginLoaded -ne $true -or $restore.databaseReadback -ne $true -or $restore.wordpressBytesVerified -ne $true) { throw 'invalid' }
        if ((Get-ProductionSha256 (Join-Path $RunRoot 'ciphertext.age')) -cne $Backup.ciphertextSha256) { throw 'invalid' }
    } catch { throw 'Verified local recovery evidence is incomplete or mismatched.' }
    $evidence=[ordered]@{schemaVersion='tio2-deployment-evidence-v1';siteId='tio2-my';preparedProofSha256=$Prepared.candidate.proofSha256;baselineSha256=$Prepared.active.enrollmentSha256;backupId=$Backup.backupId;manifestSha256=$Backup.manifestSha256;ciphertextSha256=$Backup.ciphertextSha256;offHost=@{verified=$true;sha256=$Backup.ciphertextSha256};decryption=@{verified=$true;evidenceSha256=Get-ProductionSha256 (Join-Path $RunRoot 'decryption.json')};restore=@{verified=$true;evidenceSha256=Get-ProductionSha256 (Join-Path $RunRoot 'restore.json')};change=@{database='none';wordpress='unchanged';backwardCompatible=$true}}
    Save-ProductionJson (Join-Path $RunRoot 'deployment-evidence.json') $evidence
    return $evidence
}
function Invoke-ProductionOperation {
    param([ValidateSet('Status','Release','Verify','Rollback')]$Operation,[string]$ConfigPath,[string]$RunRoot)
    $config=Read-ProductionJson $ConfigPath; Assert-ProductionConnection $config
    $RunRoot=[IO.Path]::GetFullPath($RunRoot); [IO.Directory]::CreateDirectory($RunRoot)|Out-Null
    $lock=[IO.File]::Open((Join-Path $RunRoot 'controller.lock'),'OpenOrCreate','ReadWrite','None')
    try {
        $binding=@{siteId=$config.siteId;host=$config.host;port=$config.port;hostKey=$config.hostKey;baselineSha256=$config.baselineSha256}
        $bindPath=Join-Path $RunRoot 'connection.json'
        if (Test-Path $bindPath) { $old=Read-ProductionJson $bindPath; foreach($name in $binding.Keys){if($old[$name] -cne $binding[$name]){throw 'Run connection identity changed.'}} } else { Save-ProductionJson $bindPath $binding }
        $status=Invoke-ProductionTransport $config $RunRoot action status
        Assert-ProductionActionReceipt status $status $null
        Save-ProductionJson (Join-Path $RunRoot 'status.json') $status
        if($Operation -eq 'Status'){return $status}
        $manifest=Read-ProductionJson (Join-Path $RunRoot 'release-manifest.json'); $proof=Read-ProductionJson (Join-Path $RunRoot 'release-proof.json')
        $candidate=@{commit=$manifest.commit;archiveSha256=Get-ProductionSha256 (Join-Path $RunRoot 'release.tar.gz');manifestSha256=Get-ProductionSha256 (Join-Path $RunRoot 'release-manifest.json');proofSha256=Get-ProductionSha256 (Join-Path $RunRoot 'release-proof.json')}
        if($manifest.siteId -ne 'tio2-my' -or $manifest.archiveSha256 -cne $candidate.archiveSha256 -or $proof.commit -cne $candidate.commit -or $proof.manifestSha256 -cne $candidate.manifestSha256 -or $proof.archiveSha256 -cne $candidate.archiveSha256){throw 'Local package identity mismatch.'}
        $preparedPath=Join-Path $RunRoot 'prepare.json'
        if($Operation -eq 'Release' -and -not (Test-Path $preparedPath)){
            if($status.state.state -eq 'PREPARED'){
                Assert-ProductionActionReceipt status $status $candidate
                $prepared=@{action='prepare';ok=$true;state='PREPARED';candidate=$status.state.details.candidate;active=$status.state.details.active}
            } else {
                foreach($name in @('release.tar.gz','release-manifest.json','release-proof.json')){Invoke-ProductionTransport $config $RunRoot upload $name}
                $prepared=Invoke-ProductionTransport $config $RunRoot action prepare
            }
            Assert-ProductionActionReceipt prepare $prepared $candidate
            if($prepared.active.enrollmentSha256 -cne $config.baselineSha256){throw 'Prepared server baseline identity mismatch.'}
            Save-ProductionJson $preparedPath $prepared
            $status=Invoke-ProductionTransport $config $RunRoot action status
        }
        $prepared=Read-ProductionJson $preparedPath; Assert-ProductionActionReceipt prepare $prepared $candidate
        if($prepared.active.enrollmentSha256 -cne $config.baselineSha256){throw 'Prepared server baseline identity mismatch.'}
        Assert-ProductionActionReceipt status $status $candidate
        if($Operation -eq 'Release'){
            if($status.state.state -in @('PREPARED','BACKED_UP')){
                $request=Get-ProductionBackupRequest $RunRoot $candidate.proofSha256 $prepared.active.enrollmentSha256
                Invoke-ProductionTransport $config $RunRoot upload 'backup-request.json'
                $backup=Invoke-ProductionTransport $config $RunRoot action backup
                Assert-ProductionActionReceipt backup $backup $null
                if($backup.requestId -cne $request.requestId -or $backup.backupId -notmatch '^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{40}-[a-f0-9]{32}$' -or $backup.ciphertextSha256 -notmatch '^[a-f0-9]{64}$' -or $backup.manifestSha256 -notmatch '^[a-f0-9]{64}$' -or $backup.writesResumed -isnot [bool] -or $backup.autoRestoreEligible -isnot [bool] -or $backup.writesResumed -ne $true -or $backup.autoRestoreEligible -ne $false){throw 'Backup receipt identity mismatch.'}
                $backupPath=Join-Path $RunRoot 'backup.json'
                if(Test-Path $backupPath){$old=Read-ProductionJson $backupPath;foreach($name in @('requestId','backupId','manifestSha256','ciphertextSha256')){if($old[$name] -cne $backup[$name]){throw 'Backup replay receipt changed.'}}}
                Save-ProductionJson $backupPath $backup
                Invoke-ProductionTransport $config $RunRoot download $backup.backupId
                $part=Join-Path $RunRoot 'ciphertext.age.part'
                if((Get-ProductionSha256 $part) -cne $backup.ciphertextSha256){throw 'Downloaded ciphertext hash mismatch.'}
                [IO.File]::Move($part,(Join-Path $RunRoot 'ciphertext.age'),$true)
                Invoke-ProductionRecovery $config $RunRoot
                $null=New-ProductionDeploymentEvidence $RunRoot $prepared $backup
                Invoke-ProductionTransport $config $RunRoot upload 'deployment-evidence.json'
            }
            $deploy=Invoke-ProductionTransport $config $RunRoot action deploy
            Assert-ProductionActionReceipt deploy $deploy $candidate
            Save-ProductionJson (Join-Path $RunRoot 'deploy.json') $deploy
            $action='verify'
        } else {$action=$Operation.ToLowerInvariant()}
        if($action -eq 'rollback'){
            $intentPath=Join-Path $RunRoot 'rollback-intent.json'
            if(Test-Path -LiteralPath $intentPath){$intent=Read-ProductionJson $intentPath}
            else{
                $intent=@{schemaVersion='tio2-rollback-intent-v1';siteId='tio2-my';candidate=$candidate;activeBaselineSha256=$status.state.details.active.enrollmentSha256;preparedBaselineSha256=$prepared.active.enrollmentSha256;backupId=$status.state.details.deploymentEvidence.backupId}
                Save-ProductionJson $intentPath $intent
            }
            foreach($name in $candidate.Keys){if($intent.candidate[$name] -cne $candidate[$name]){throw 'Persisted rollback candidate changed.'}}
            if($intent.preparedBaselineSha256 -cne $prepared.active.enrollmentSha256 -or $intent.backupId -cne $status.state.details.deploymentEvidence.backupId){throw 'Persisted rollback generation changed.'}
            $result=Invoke-ProductionTransport $config $RunRoot action $action $intent
        } else {$result=Invoke-ProductionTransport $config $RunRoot action $action}
        Assert-ProductionActionReceipt $action $result $candidate
        if($action -eq 'verify' -and $result.state -eq 'PUBLIC_VERIFIED' -and $result.active.commit -cne $candidate.commit){throw 'Verified active identity mismatch.'}
        if($result.state -eq 'ROLLED_BACK' -and $result.active.sourceSha256 -cne $prepared.active.sourceSha256){throw 'Rollback active identity mismatch.'}
        Save-ProductionJson (Join-Path $RunRoot "$action.json") $result
        return $result
    } finally {$lock.Dispose()}
}
Export-ModuleMember -Function Assert-ProductionConnection,Assert-ProductionActionReceipt,Get-ProductionBackupRequest,New-ProductionDeploymentEvidence,Invoke-ProductionOperation
