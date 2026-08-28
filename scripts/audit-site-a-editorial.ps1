[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Strict', 'DeferredProductRelations')]
    [string] $RelationshipMode,
    [Parameter(Mandatory = $true)][string] $ApplicationsManifestPath,
    [Parameter(Mandatory = $true)][string] $ResourcesManifestPath,
    [Parameter(Mandatory = $true)][string] $ProductsManifestPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$RepositoryRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$WordPressDirectory = Join-Path $RepositoryRoot 'wordpress'
$SeedDirectory = Join-Path $WordPressDirectory 'seed'
$EnvironmentFile = Join-Path $WordPressDirectory '.env'
$ComposeFile = Join-Path $WordPressDirectory 'docker-compose.yml'
$ExporterPath = Join-Path $SeedDirectory 'export-site-a-editorial-audit.php'
. (Join-Path $PSScriptRoot 'editorial/local-editorial-runtime.ps1')
foreach ($RequiredFile in @($EnvironmentFile, $ComposeFile, $ExporterPath)) { if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) { throw "Missing required local editorial audit file: $RequiredFile" } }
& (Join-Path $PSScriptRoot 'assert-local-wordpress-env.ps1') -EnvironmentPath $EnvironmentFile | Out-Null

function ConvertTo-LocalEditorialDeferredProductEdgeTuples {
    param([AllowNull()][AllowEmptyCollection()][object[]] $Edges)

    if ($null -eq $Edges) { $Edges = @() }
    $Tuples = [System.Collections.Generic.List[object]]::new()
    foreach ($Edge in $Edges) {
        $ExpectedKeys = @('field', 'sourceId', 'sourceType', 'targetProductId')
        $ActualKeys = if ($null -eq $Edge) { @() } else { @($Edge.PSObject.Properties.Name) | Sort-Object }
        if (Compare-Object -ReferenceObject $ExpectedKeys -DifferenceObject $ActualKeys) {
            throw 'Local Site A editorial audit deferred Product edges contain an invalid tuple shape.'
        }
        foreach ($Property in $ExpectedKeys) {
            if ([string]::IsNullOrWhiteSpace([string] $Edge.$Property)) {
                throw 'Local Site A editorial audit deferred Product edges contain an invalid tuple value.'
            }
        }
        $Tuples.Add([pscustomobject] [ordered]@{
            sourceType = [string] $Edge.sourceType
            sourceId = [string] $Edge.sourceId
            field = [string] $Edge.field
            targetProductId = [string] $Edge.targetProductId
        })
    }
    return $Tuples.ToArray()
}

function Get-LocalEditorialExpectedDeferredProductEdges {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('Strict', 'DeferredProductRelations')][string] $RelationshipMode,
        [Parameter(Mandatory = $true)][string] $ApplicationsPath,
        [Parameter(Mandatory = $true)][string] $ResourcesPath
    )

    if ('Strict' -eq $RelationshipMode) { return @() }
    $Edges = [System.Collections.Generic.List[object]]::new()
    foreach ($Source in @(
        [pscustomobject]@{ Type = 'application'; Path = $ApplicationsPath },
        [pscustomobject]@{ Type = 'resource'; Path = $ResourcesPath }
    )) {
        $Manifest = Get-Content -LiteralPath $Source.Path -Raw | ConvertFrom-Json -ErrorAction Stop
        foreach ($Record in @($Manifest.records)) {
            foreach ($Target in @($Record.relationships)) {
                if ('product' -eq [string] $Target.type) {
                    $Edges.Add([pscustomobject] [ordered]@{
                        sourceType = [string] $Source.Type
                        sourceId = [string] $Record.identity.id
                        field = 'relationships'
                        targetProductId = [string] $Target.id
                    })
                }
            }
        }
    }
    return @($Edges.ToArray() | Sort-Object sourceType, sourceId, field, targetProductId)
}

function Get-LocalEditorialDeferredProductEdgesSha256 {
    param([AllowNull()][AllowEmptyCollection()][object[]] $Edges)

    if ($null -eq $Edges) { $Edges = @() }
    $CanonicalEdges = @(ConvertTo-LocalEditorialDeferredProductEdgeTuples -Edges $Edges)
    $HashEdges = @($CanonicalEdges | ForEach-Object {
        [pscustomobject] [ordered]@{
            field = $_.field
            sourceId = $_.sourceId
            sourceType = $_.sourceType
            targetProductId = $_.targetProductId
        }
    })
    $CanonicalJson = ConvertTo-Json -InputObject ([object[]] $HashEdges) -Compress -Depth 4
    $Bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($CanonicalJson)
    return 'sha256:' + [System.Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($Bytes)).ToLowerInvariant()
}

function Assert-LocalEditorialAuditResult {
    param(
        [Parameter(Mandatory = $true)][AllowNull()][object] $Result,
        [Parameter(Mandatory = $true)][string] $ExpectedRelationshipMode,
        [Parameter(Mandatory = $true)][string] $ExpectedApplicationsSha256,
        [Parameter(Mandatory = $true)][string] $ExpectedResourcesSha256,
        [Parameter(Mandatory = $true)][string] $ExpectedProductsSha256,
        [AllowNull()][AllowEmptyCollection()][object[]] $ExpectedDeferredProductEdges
    )

    $ExpectedKeys = @(
        'applicationCount', 'applicationSha256', 'deferredProductEdges',
        'deferredProductEdgesSha256', 'manifestSha256', 'readbackSha256',
        'recordCount', 'records', 'relationshipMode', 'resourceCount',
        'resourceSha256', 'siteBInvariantSha256', 'version'
    ) | Sort-Object
    if ($null -eq $Result) { throw 'Local Site A editorial audit did not return the expected result shape.' }
    $ActualKeys = @($Result.PSObject.Properties.Name) | Sort-Object
    if (Compare-Object -ReferenceObject $ExpectedKeys -DifferenceObject $ActualKeys) { throw 'Local Site A editorial audit did not return the expected result shape.' }
    $ExpectedManifestKeys = @('applications', 'products', 'resources') | Sort-Object
    $ActualManifestKeys = if ($null -eq $Result.manifestSha256) { @() } else { @($Result.manifestSha256.PSObject.Properties.Name) | Sort-Object }
    if (Compare-Object -ReferenceObject $ExpectedManifestKeys -DifferenceObject $ActualManifestKeys) { throw 'Local Site A editorial audit did not return the expected result shape.' }
    $HasIntegerCounts =
        ($Result.recordCount -is [int] -or $Result.recordCount -is [long]) -and
        ($Result.applicationCount -is [int] -or $Result.applicationCount -is [long]) -and
        ($Result.resourceCount -is [int] -or $Result.resourceCount -is [long])
    $HashProperties = @('applicationSha256', 'resourceSha256', 'readbackSha256', 'deferredProductEdgesSha256', 'siteBInvariantSha256')
    $HasValidHashes = $true
    foreach ($Property in $HashProperties) {
        if ([string] $Result.$Property -notmatch '^sha256:[a-f0-9]{64}$') { $HasValidHashes = $false }
    }
    $HasExpectedManifestHashes =
        [string] $Result.manifestSha256.applications -ceq $ExpectedApplicationsSha256 -and
        [string] $Result.manifestSha256.resources -ceq $ExpectedResourcesSha256 -and
        [string] $Result.manifestSha256.products -ceq $ExpectedProductsSha256
    $ExpectedDeferredEdges = @(ConvertTo-LocalEditorialDeferredProductEdgeTuples -Edges $ExpectedDeferredProductEdges)
    $ActualDeferredEdges = @(if ($Result.deferredProductEdges -is [System.Array]) { @(ConvertTo-LocalEditorialDeferredProductEdgeTuples -Edges @($Result.deferredProductEdges)) } else { @() })
    $ExpectedDeferredEdgesJson = ConvertTo-Json -InputObject ([object[]] $ExpectedDeferredEdges) -Compress -Depth 4
    $ActualDeferredEdgesJson = ConvertTo-Json -InputObject ([object[]] $ActualDeferredEdges) -Compress -Depth 4
    $ExpectedDeferredEdgesSha256 = Get-LocalEditorialDeferredProductEdgesSha256 -Edges $ExpectedDeferredEdges
    $ActualDeferredEdgesSha256 = if ($Result.deferredProductEdges -is [System.Array]) { Get-LocalEditorialDeferredProductEdgesSha256 -Edges $ActualDeferredEdges } else { $null }
    if ($Result.deferredProductEdges -is [System.Array] -and $ExpectedDeferredEdgesJson -cne $ActualDeferredEdgesJson) {
        throw "Local Site A editorial audit deferred Product edges do not exactly match the staged manifests (expected $ExpectedDeferredEdgesJson; result $ActualDeferredEdgesJson)."
    }
    if ($Result.deferredProductEdges -is [System.Array] -and ([string] $Result.deferredProductEdgesSha256 -cne $ExpectedDeferredEdgesSha256 -or $ActualDeferredEdgesSha256 -cne $ExpectedDeferredEdgesSha256)) {
        throw "Local Site A editorial audit deferred Product edge hashes do not exactly match the staged manifests (expected $ExpectedDeferredEdgesSha256; result $($Result.deferredProductEdgesSha256); readback $ActualDeferredEdgesSha256)."
    }

    if (
        1 -ne $Result.version -or
        $ExpectedRelationshipMode -cne [string] $Result.relationshipMode -or
        -not $HasIntegerCounts -or
        39 -ne $Result.recordCount -or
        28 -ne $Result.applicationCount -or
        11 -ne $Result.resourceCount -or
        $Result.records -isnot [System.Array] -or
        39 -ne @($Result.records).Count -or
        $Result.deferredProductEdges -isnot [System.Array] -or
        $ExpectedDeferredEdgesJson -cne $ActualDeferredEdgesJson -or
        [string] $Result.deferredProductEdgesSha256 -cne $ExpectedDeferredEdgesSha256 -or
        $ActualDeferredEdgesSha256 -cne $ExpectedDeferredEdgesSha256 -or
        -not $HasValidHashes -or
        -not $HasExpectedManifestHashes
    ) {
        throw 'Local Site A editorial audit did not return the expected result shape.'
    }
}

$ApplicationsManifestPath = Resolve-LocalEditorialManifestPath -Path $ApplicationsManifestPath -Name 'ApplicationsManifestPath'
$ResourcesManifestPath = Resolve-LocalEditorialManifestPath -Path $ResourcesManifestPath -Name 'ResourcesManifestPath'
$ProductsManifestPath = Resolve-LocalEditorialManifestPath -Path $ProductsManifestPath -Name 'ProductsManifestPath'
$EnvironmentValues = @{}
foreach ($Line in Get-Content -LiteralPath $EnvironmentFile) { if ($Line -match '^([^#=]+)=(.*)$') { $EnvironmentValues[$Matches[1].Trim()] = $Matches[2].Trim() } }
$AdminUser = [string] ($EnvironmentValues['WORDPRESS_ADMIN_USER'] ?? '')
if ([string]::IsNullOrWhiteSpace($AdminUser)) { throw 'The local WordPress environment does not declare WORDPRESS_ADMIN_USER.' }

$RuntimeApplicationsPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-audit-applications-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$RuntimeResourcesPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-audit-resources-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$RuntimeProductsPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-audit-products-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$CapabilityPath = Join-Path $SeedDirectory ('.runtime-site-a-editorial-audit-capability-{0}.json' -f ([Guid]::NewGuid().ToString('N')))
$TemporaryPaths = @($CapabilityPath, $RuntimeApplicationsPath, $RuntimeResourcesPath, $RuntimeProductsPath)
$ApplicationsSourceHashBefore = $null; $ResourcesSourceHashBefore = $null; $ProductsSourceHashBefore = $null
$OperationError = $null; $FinalizationError = $null
try {
    $ApplicationsSourceHashBefore = (Get-FileHash -LiteralPath $ApplicationsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ResourcesSourceHashBefore = (Get-FileHash -LiteralPath $ResourcesManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSourceHashBefore = (Get-FileHash -LiteralPath $ProductsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::Copy($ApplicationsManifestPath, $RuntimeApplicationsPath, $false); [System.IO.File]::Copy($ResourcesManifestPath, $RuntimeResourcesPath, $false); [System.IO.File]::Copy($ProductsManifestPath, $RuntimeProductsPath, $false)
    $ApplicationsSourceHashAfter = (Get-FileHash -LiteralPath $ApplicationsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ResourcesSourceHashAfter = (Get-FileHash -LiteralPath $ResourcesManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSourceHashAfter = (Get-FileHash -LiteralPath $ProductsManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ApplicationsSha256 = (Get-FileHash -LiteralPath $RuntimeApplicationsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ResourcesSha256 = (Get-FileHash -LiteralPath $RuntimeResourcesPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $ProductsSha256 = (Get-FileHash -LiteralPath $RuntimeProductsPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($ApplicationsSourceHashBefore -cne $ApplicationsSourceHashAfter -or $ApplicationsSha256 -cne $ApplicationsSourceHashBefore -or $ResourcesSourceHashBefore -cne $ResourcesSourceHashAfter -or $ResourcesSha256 -cne $ResourcesSourceHashBefore -or $ProductsSourceHashBefore -cne $ProductsSourceHashAfter -or $ProductsSha256 -cne $ProductsSourceHashBefore) { throw 'An editorial manifest changed while its audit snapshot was staged.' }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-applications.mjs') $RuntimeApplicationsPath; if ($LASTEXITCODE -ne 0) { throw 'The staged Application audit manifest failed validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-resources.mjs') $RuntimeResourcesPath; if ($LASTEXITCODE -ne 0) { throw 'The staged Resource audit manifest failed validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/products/validate-product-manifest.mjs') $RuntimeProductsPath; if ($LASTEXITCODE -ne 0) { throw 'The staged Product audit manifest failed validation.' }
    & node (Join-Path $RepositoryRoot 'scripts/editorial/validate-site-a-content-graph.mjs') --applications $RuntimeApplicationsPath --resources $RuntimeResourcesPath --products $RuntimeProductsPath; if ($LASTEXITCODE -ne 0) { throw 'The staged editorial audit graph failed validation.' }
    $ExpectedDeferredProductEdges = @(Get-LocalEditorialExpectedDeferredProductEdges -RelationshipMode $RelationshipMode -ApplicationsPath $RuntimeApplicationsPath -ResourcesPath $RuntimeResourcesPath)
    $TokenBytes = New-Object byte[] 32
    $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $Generator.GetBytes($TokenBytes) } finally { $Generator.Dispose() }
    $Token = -join ($TokenBytes | ForEach-Object { $_.ToString('x2') })
    $Capability = [ordered]@{ version = 1; token = $Token; relationshipMode = $RelationshipMode; applicationsPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeApplicationsPath); applicationsSha256 = $ApplicationsSha256; resourcesPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeResourcesPath); resourcesSha256 = $ResourcesSha256; productsPath = '/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($RuntimeProductsPath); productsSha256 = $ProductsSha256 }
    [System.IO.File]::WriteAllText($CapabilityPath, ($Capability | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
    $DockerArguments = @('compose', '--env-file', $EnvironmentFile, '-f', $ComposeFile, 'run', '--rm', '--no-TTY', '--user', '33:33', '-e', 'TIO2_LOCAL_EDITORIAL_AUDIT_CAPABILITY', 'wpcli', 'wp', "--user=$AdminUser", 'eval-file', '/workspace/wordpress/seed/export-site-a-editorial-audit.php', ('/workspace/wordpress/seed/' + [System.IO.Path]::GetFileName($CapabilityPath)))
    $CapabilityEnvironmentName = 'TIO2_LOCAL_EDITORIAL_AUDIT_CAPABILITY'
    $PreviousCapabilityEnvironment = [System.Environment]::GetEnvironmentVariable($CapabilityEnvironmentName, [System.EnvironmentVariableTarget]::Process)
    try {
        [System.Environment]::SetEnvironmentVariable($CapabilityEnvironmentName, $Token, [System.EnvironmentVariableTarget]::Process)
        $PreviousErrorActionPreference = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
        try { $CommandOutput = & docker @DockerArguments 2>&1; $CommandExitCode = $LASTEXITCODE } finally { $ErrorActionPreference = $PreviousErrorActionPreference }
    }
    finally {
        [System.Environment]::SetEnvironmentVariable($CapabilityEnvironmentName, $PreviousCapabilityEnvironment, [System.EnvironmentVariableTarget]::Process)
    }
    foreach ($OutputLine in $CommandOutput) { Write-Host $OutputLine }
    if ($CommandExitCode -ne 0) { throw "Local Site A editorial audit failed with exit code $CommandExitCode." }
    $Marker = 'TIO2_SITE_A_EDITORIAL_AUDIT_RESULT '
    $ResultLines = @($CommandOutput | ForEach-Object { [string] $_ } | Where-Object { $_.StartsWith($Marker, [System.StringComparison]::Ordinal) })
    if (1 -ne $ResultLines.Count) { throw 'Local Site A editorial audit did not return exactly one deterministic result.' }
    try {
        $AuditResult = $ResultLines[0].Substring($Marker.Length) | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        throw 'Local Site A editorial audit did not return valid JSON after its deterministic result marker.'
    }
    Assert-LocalEditorialAuditResult -Result $AuditResult -ExpectedRelationshipMode $RelationshipMode -ExpectedApplicationsSha256 $ApplicationsSha256 -ExpectedResourcesSha256 $ResourcesSha256 -ExpectedProductsSha256 $ProductsSha256 -ExpectedDeferredProductEdges $ExpectedDeferredProductEdges
}
catch { $OperationError = $_.Exception }
finally {
    try {
        Complete-LocalEditorialRuntime -TemporaryPaths $TemporaryPaths -SourceChecks @(
            [pscustomobject]@{ Label = 'Application'; Path = $ApplicationsManifestPath; ExpectedHash = $ApplicationsSourceHashBefore },
            [pscustomobject]@{ Label = 'Resource'; Path = $ResourcesManifestPath; ExpectedHash = $ResourcesSourceHashBefore },
            [pscustomobject]@{ Label = 'Product'; Path = $ProductsManifestPath; ExpectedHash = $ProductsSourceHashBefore }
        )
    }
    catch { $FinalizationError = $_.Exception }
}
if ($null -ne $OperationError -and $null -ne $FinalizationError) { throw [System.AggregateException]::new('The local editorial audit and finalization both failed.', @($OperationError, $FinalizationError)) }
if ($null -ne $OperationError) { throw $OperationError }
if ($null -ne $FinalizationError) { throw $FinalizationError }
