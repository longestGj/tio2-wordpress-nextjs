#requires -Version 7.2
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Package','Status','Release','Verify','Rollback')][string]$Operation,
    [string]$ConfigPath,
    [string]$RunRoot,
    [string]$PrereleaseReceiptPath,
    [string]$ReleaseId
)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'production/Production.Core.psm1') -Force
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
try {
    if($Operation -eq 'Package') {
        $result=New-ProductionPackage -RepositoryRoot $repository -OutputRoot (Join-Path $repository '.production') -PrereleaseReceiptPath $PrereleaseReceiptPath -ReleaseId $ReleaseId
    } else {
        if(-not $ConfigPath -or -not $RunRoot){throw 'ConfigPath and RunRoot are required.'}
        $result=Invoke-ProductionOperation -Operation $Operation -ConfigPath $ConfigPath -RunRoot $RunRoot
    }
    $result|ConvertTo-Json -Depth 50 -Compress
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
