[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'

if (-not (Test-Path -LiteralPath $EnvironmentFile)) {
    throw "Missing wordpress/.env. Copy wordpress/.env.example before bootstrapping."
}

$LocalEnvironment = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentFile) {
    $TrimmedLine = $Line.Trim()
    if (-not $TrimmedLine -or $TrimmedLine.StartsWith('#')) {
        continue
    }

    $Name, $Value = $TrimmedLine -split '=', 2
    $LocalEnvironment[$Name.Trim()] = $Value.Trim()
}

foreach ($RequiredName in @('WORDPRESS_ADMIN_USER', 'WORDPRESS_ADMIN_PASSWORD', 'WORDPRESS_ADMIN_EMAIL')) {
    if (-not $LocalEnvironment.ContainsKey($RequiredName) -or -not $LocalEnvironment[$RequiredName]) {
        throw "Missing required value $RequiredName in wordpress/.env."
    }
}

$ComposeArguments = @(
    'compose',
    '--env-file', $EnvironmentFile,
    '-f', $ComposeFile
)

function Invoke-WpCli {
    param(
        [Parameter(Mandatory = $true)]
        [string[]] $Arguments,
        [switch] $AllowFailure
    )

    $PreviousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $CommandOutput = & docker @ComposeArguments run --rm --user 33:33 wpcli wp @Arguments 2>&1
        $CommandExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $PreviousErrorActionPreference
    }

    foreach ($OutputLine in $CommandOutput) {
        Write-Host $OutputLine
    }

    if (-not $AllowFailure -and $CommandExitCode -ne 0) {
        throw "WP-CLI command failed with exit code $CommandExitCode."
    }

    return $CommandExitCode
}

$CoreReady = $false
for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
    $CoreVersionExitCode = Invoke-WpCli -Arguments @('core', 'version') -AllowFailure
    if ($CoreVersionExitCode -eq 0) {
        $CoreReady = $true
        break
    }

    Start-Sleep -Seconds 2
}

if (-not $CoreReady) {
    throw 'WordPress core did not become available to WP-CLI.'
}

$InstalledExitCode = Invoke-WpCli -Arguments @('core', 'is-installed') -AllowFailure
if ($InstalledExitCode -ne 0) {
    Invoke-WpCli -Arguments @(
        'core', 'install',
        '--url=http://localhost:8080',
        '--title=TiO2 Local',
        "--admin_user=$($LocalEnvironment['WORDPRESS_ADMIN_USER'])",
        "--admin_password=$($LocalEnvironment['WORDPRESS_ADMIN_PASSWORD'])",
        "--admin_email=$($LocalEnvironment['WORDPRESS_ADMIN_EMAIL'])",
        '--skip-email'
    ) | Out-Null
}

Invoke-WpCli -Arguments @(
    'plugin', 'install',
    'wp-graphql',
    'advanced-custom-fields',
    'wordpress-seo',
    'wpgraphql-acf',
    'add-wpgraphql-seo',
    '--activate'
) | Out-Null

Invoke-WpCli -Arguments @('plugin', 'activate', 'tio2-site-model') | Out-Null

foreach ($SiteScope in @('tio2-a', 'tio2-b')) {
    $TermExitCode = Invoke-WpCli -Arguments @('term', 'get', 'site_scope', $SiteScope, '--by=slug', '--field=term_id') -AllowFailure
    if ($TermExitCode -ne 0) {
        Invoke-WpCli -Arguments @('term', 'create', 'site_scope', $SiteScope, "--slug=$SiteScope") | Out-Null
    }
}

Invoke-WpCli -Arguments @('rewrite', 'structure', '/%postname%/', '--hard') | Out-Null

Write-Host 'WordPress bootstrap complete.'
Invoke-WpCli -Arguments @('core', 'version') | Out-Null
Invoke-WpCli -Arguments @('plugin', 'list', '--status=active', '--fields=name,version,status', '--format=table') | Out-Null
