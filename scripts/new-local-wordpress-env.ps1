[CmdletBinding()]
param(
    [string] $OutputPath,
    [switch] $Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$TemplatePath = Join-Path $RepositoryRoot 'wordpress/.env.example'
if (-not $OutputPath) {
    $OutputPath = Join-Path $RepositoryRoot 'wordpress/.env'
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
if ((Test-Path -LiteralPath $OutputPath) -and -not $Force) {
    throw "Refusing to overwrite existing local environment file: $OutputPath"
}

function New-HexSecret {
    $Bytes = New-Object byte[] 32
    $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $Generator.GetBytes($Bytes)
    }
    finally {
        $Generator.Dispose()
    }
    return ([BitConverter]::ToString($Bytes)).Replace('-', '').ToLowerInvariant()
}

$GeneratedNames = @(
    'WORDPRESS_ADMIN_PASSWORD',
    'NEXTJS_REVALIDATION_SECRET_TIO2_A',
    'NEXTJS_REVALIDATION_SECRET_TIO2_B',
    'NEXTJS_REVALIDATION_SECRET_TIO2_MY',
    'NEXTJS_PREVIEW_SECRET_TIO2_A',
    'NEXTJS_PREVIEW_SECRET_TIO2_B',
    'NEXTJS_PREVIEW_SECRET_TIO2_MY'
)
$GeneratedValues = @{}
foreach ($Name in $GeneratedNames) {
    $GeneratedValues[$Name] = New-HexSecret
}

$SourcePath = if ((Test-Path -LiteralPath $OutputPath) -and $Force) {
    $OutputPath
} else {
    $TemplatePath
}
$OutputLines = foreach ($Line in Get-Content -LiteralPath $SourcePath) {
    if ($Line -match '^([^#=]+)=(.*)$') {
        $Name = $Matches[1]
        if ($GeneratedValues.ContainsKey($Name)) {
            "$Name=$($GeneratedValues[$Name])"
            continue
        }
        if ('WORDPRESS_ADMIN_USER' -eq $Name -and $Matches[2].Trim().ToLowerInvariant() -eq 'admin') {
            'WORDPRESS_ADMIN_USER=tio2-local-editor'
            continue
        }
    }
    $Line
}

$OutputDirectory = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}
[System.IO.File]::WriteAllLines(
    $OutputPath,
    $OutputLines,
    [System.Text.UTF8Encoding]::new($false)
)
Write-Output "Generated local WordPress environment at $OutputPath. Secret values were not printed."
