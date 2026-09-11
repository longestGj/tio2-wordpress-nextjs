[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Reserve', 'Attach', 'Release', 'Status', 'Doctor')]
    [string] $Action,
    [string] $Purpose,
    [string] $RunId,
    [string] $SiteId,
    [string] $LeaseId,
    [int] $ProcessId,
    [string] $ComposeProject,
    [int] $Count = 1,
    [switch] $Json
)

$CliPath = Join-Path $PSScriptRoot 'runtime-ports\cli.mjs'
$CliArguments = @($CliPath, $Action.ToLowerInvariant())

switch ($Action) {
    'Reserve' {
        if ($PSBoundParameters.ContainsKey('Purpose')) {
            $CliArguments += @('--purpose', $Purpose)
        }
        if ($PSBoundParameters.ContainsKey('RunId')) {
            $CliArguments += @('--run-id', $RunId)
        }
        if ($PSBoundParameters.ContainsKey('SiteId')) {
            $CliArguments += @('--site-id', $SiteId)
        }
        if ($PSBoundParameters.ContainsKey('Count')) {
            $CliArguments += @('--count', $Count.ToString())
        }
    }
    'Attach' {
        if ($PSBoundParameters.ContainsKey('LeaseId')) {
            $CliArguments += @('--lease-id', $LeaseId)
        }
        if ($PSBoundParameters.ContainsKey('ProcessId')) {
            $CliArguments += @('--process-id', $ProcessId.ToString())
        }
        if ($PSBoundParameters.ContainsKey('ComposeProject')) {
            $CliArguments += @('--compose-project', $ComposeProject)
        }
    }
    'Release' {
        if ($PSBoundParameters.ContainsKey('LeaseId')) {
            $CliArguments += @('--lease-id', $LeaseId)
        }
        if ($PSBoundParameters.ContainsKey('ProcessId')) {
            $CliArguments += @('--process-id', $ProcessId.ToString())
        }
        if ($PSBoundParameters.ContainsKey('ComposeProject')) {
            $CliArguments += @('--compose-project', $ComposeProject)
        }
    }
}

& node @CliArguments
exit $LASTEXITCODE
