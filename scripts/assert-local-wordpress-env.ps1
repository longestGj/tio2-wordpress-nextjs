[CmdletBinding()]
param(
    [string] $EnvironmentPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
if (-not $EnvironmentPath) {
    $EnvironmentPath = Join-Path $RepositoryRoot 'wordpress/.env'
}
$EnvironmentPath = [System.IO.Path]::GetFullPath($EnvironmentPath)
if (-not (Test-Path -LiteralPath $EnvironmentPath)) {
    throw 'Local WordPress environment requires generated 64-hex credentials. Run scripts/new-local-wordpress-env.ps1.'
}

$Values = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentPath) {
    if ($Line -match '^([^#=]+)=(.*)$') {
        $Values[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

$SecretNames = @(
    'WORDPRESS_ADMIN_PASSWORD',
    'NEXTJS_REVALIDATION_SECRET_TIO2_A',
    'NEXTJS_REVALIDATION_SECRET_TIO2_B',
    'NEXTJS_PREVIEW_SECRET_TIO2_A',
    'NEXTJS_PREVIEW_SECRET_TIO2_B'
)
$AdminUser = if ($Values.ContainsKey('WORDPRESS_ADMIN_USER')) { $Values['WORDPRESS_ADMIN_USER'] } else { '' }
$Secrets = @($SecretNames | ForEach-Object {
    if ($Values.ContainsKey($_)) { $Values[$_] } else { '' }
})
if (
    -not $AdminUser -or
    $AdminUser.ToLowerInvariant() -eq 'admin' -or
    @($Secrets | Where-Object { $_ -notmatch '^[0-9a-f]{64}$' }).Count -gt 0 -or
    @($Secrets | Select-Object -Unique).Count -ne $SecretNames.Count
) {
    throw 'Local WordPress environment requires generated 64-hex credentials and a non-default administrator. Run scripts/new-local-wordpress-env.ps1 -Force to migrate it.'
}

Write-Output 'Local WordPress generated credential contract passed.'
