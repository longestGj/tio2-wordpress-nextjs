Set-StrictMode -Version Latest

function Resolve-LocalEditorialManifestPath {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)][string] $Name
    )

    if (
        [string]::IsNullOrWhiteSpace($Path) -or
        $Path.IndexOfAny([char[]]'*?') -ge 0 -or
        $Path -match '^[A-Za-z][A-Za-z0-9+.-]*://' -or
        $Path -match '^[\\/]{2}' -or
        $Path -match '::'
    ) {
        throw "$Name must be one literal local fixed-disk path without URI, wildcard, UNC, device, or provider syntax."
    }

    $Resolved = [System.IO.Path]::GetFullPath($Path)
    $Root = [System.IO.Path]::GetPathRoot($Resolved)
    if ([string]::IsNullOrWhiteSpace($Root)) {
        throw "$Name must resolve to one literal local fixed-disk path."
    }
    try {
        $Drive = [System.IO.DriveInfo]::new($Root)
        if ([System.IO.DriveType]::Fixed -ne $Drive.DriveType) {
            throw "$Name must resolve to one literal local fixed-disk path."
        }
    }
    catch {
        if ($_.Exception.Message -like "$Name must resolve*") { throw }
        throw "$Name must resolve to one literal local fixed-disk path."
    }
    if (-not (Test-Path -LiteralPath $Resolved -PathType Leaf)) {
        throw "$Name must resolve to one literal local fixed-disk leaf file."
    }
    return $Resolved
}

function Complete-LocalEditorialRuntime {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]] $TemporaryPaths,
        [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]] $SourceChecks,
        [scriptblock] $DeleteFile = { param([string] $Path) [System.IO.File]::Delete($Path) },
        [scriptblock] $HashFile = { param([string] $Path) (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
    )

    $Errors = [System.Collections.Generic.List[System.Exception]]::new()
    foreach ($TemporaryPath in @($TemporaryPaths | Select-Object -Unique)) {
        try {
            if (Test-Path -LiteralPath $TemporaryPath) {
                & $DeleteFile $TemporaryPath
            }
            if (Test-Path -LiteralPath $TemporaryPath) {
                throw "Runtime file remained after cleanup: $TemporaryPath"
            }
        }
        catch {
            $Errors.Add($_.Exception)
        }
    }
    foreach ($Check in $SourceChecks) {
        if ($null -eq $Check.ExpectedHash) { continue }
        try {
            $FinalHash = & $HashFile ([string] $Check.Path)
            if ([string] $FinalHash -cne [string] $Check.ExpectedHash) {
                throw "$($Check.Label) source manifest changed during the operation."
            }
        }
        catch {
            $Errors.Add($_.Exception)
        }
    }
    if (0 -lt $Errors.Count) {
        $Messages = $Errors | ForEach-Object { $_.Message }
        throw [System.AggregateException]::new(('Local editorial runtime finalization failed: ' + ($Messages -join ' | ')), $Errors)
    }
}
