Set-StrictMode -Version Latest

function Assert-Tio2NoReparsePointChain {
    param([Parameter(Mandatory = $true)] [string] $Path)

    $Current = [System.IO.Path]::GetFullPath($Path)
    while (-not (Test-Path -LiteralPath $Current)) {
        $Parent = [System.IO.Directory]::GetParent($Current)
        if ($null -eq $Parent) { throw "No existing ancestor for local path: $Path" }
        $Current = $Parent.FullName
    }
    while ($true) {
        $Item = Get-Item -Force -LiteralPath $Current
        if (($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Unsafe local evidence path contains a reparse point: $($Item.FullName)"
        }
        $Parent = [System.IO.Directory]::GetParent($Item.FullName)
        if ($null -eq $Parent) { break }
        $Current = $Parent.FullName
    }
}

function Test-Tio2PathContained {
    param(
        [Parameter(Mandatory = $true)] [string] $AllowedRoot,
        [Parameter(Mandatory = $true)] [string] $Target
    )
    $Root = [System.IO.Path]::GetFullPath($AllowedRoot).TrimEnd('\', '/')
    $FullTarget = [System.IO.Path]::GetFullPath($Target)
    $Prefix = $Root + [System.IO.Path]::DirectorySeparatorChar
    return (
        $FullTarget.Equals($Root, [System.StringComparison]::OrdinalIgnoreCase) -or
        $FullTarget.StartsWith($Prefix, [System.StringComparison]::OrdinalIgnoreCase)
    )
}

function Resolve-Tio2SafeLocalPath {
    param(
        [Parameter(Mandatory = $true)] [string] $Path,
        [Parameter(Mandatory = $true)] [string] $AllowedRoot,
        [switch] $MustExist
    )

    if ([string]::IsNullOrWhiteSpace($Path)) { throw 'A local path is required.' }
    if (-not (Test-Path -LiteralPath $AllowedRoot -PathType Container)) {
        throw "Allowed local evidence root does not exist: $AllowedRoot"
    }
    Assert-Tio2NoReparsePointChain -Path $AllowedRoot
    $RealAllowedRoot = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $AllowedRoot).ProviderPath)
    $FullPath = [System.IO.Path]::GetFullPath($Path)
    if (-not (Test-Tio2PathContained -AllowedRoot $RealAllowedRoot -Target $FullPath)) {
        throw "Unsafe local path outside the real evidence directory: $FullPath"
    }
    Assert-Tio2NoReparsePointChain -Path $FullPath
    if ($MustExist -and -not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
        throw "Required local file does not exist: $FullPath"
    }
    if (Test-Path -LiteralPath $FullPath) {
        $RealTarget = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $FullPath).ProviderPath)
        if (-not (Test-Tio2PathContained -AllowedRoot $RealAllowedRoot -Target $RealTarget)) {
            throw "Resolved local path escaped the real evidence directory: $RealTarget"
        }
    }
    return $FullPath
}

function Write-Tio2ExclusiveUtf8File {
    param(
        [Parameter(Mandatory = $true)] [string] $Path,
        [Parameter(Mandatory = $true)] [string] $Content
    )

    $Stream = $null
    try {
        $Stream = [System.IO.File]::Open(
            $Path,
            [System.IO.FileMode]::CreateNew,
            [System.IO.FileAccess]::Write,
            [System.IO.FileShare]::None
        )
        $Bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Content)
        $Stream.Write($Bytes, 0, $Bytes.Length)
        $Stream.Flush($true)
    }
    catch [System.IO.IOException] {
        throw "Snapshot evidence already exists or could not be created exclusively: $Path"
    }
    finally {
        if ($null -ne $Stream) { $Stream.Dispose() }
    }
}
