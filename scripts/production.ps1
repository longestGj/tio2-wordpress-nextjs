#requires -Version 7.2
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Package','PackageContent','Status','Prepare','Backup','Stage','Activate','Verify','Rollback')][string]$Operation,
    [string]$ConfigPath,
    [string]$RunRoot,
    [string]$PrereleaseReceiptPath,
    [string]$ReleaseId,
    [string]$ContentPath,
    [string]$ContentPrereleasePath,
    [string]$CandidateMetadataPath,
    [string]$OutputPath
)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'production/Production.Core.psm1') -Force
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
try {
    if($Operation -eq 'Package') {
        $result=New-ProductionPackage -RepositoryRoot $repository -OutputRoot (Join-Path $repository '.production') -PrereleaseReceiptPath $PrereleaseReceiptPath -ReleaseId $ReleaseId
    } elseif($Operation -eq 'PackageContent') {
        if(-not $ContentPath -or -not $ContentPrereleasePath -or -not $CandidateMetadataPath -or -not $OutputPath){throw 'ContentPath, ContentPrereleasePath, CandidateMetadataPath and OutputPath are required.'}
        $output=@(& python -B (Join-Path $PSScriptRoot 'production/prepare_content_candidate.py') --content $ContentPath --prerelease $ContentPrereleasePath --metadata $CandidateMetadataPath --output $OutputPath)
        if($LASTEXITCODE -ne 0 -or $output.Count -ne 1){throw 'Content candidate preparation failed.'}
        $result=$output[0]|ConvertFrom-Json -AsHashtable
    } else {
        if(-not $ConfigPath -or -not $RunRoot){throw 'ConfigPath and RunRoot are required.'}
        $result=Invoke-D16ProductionOperation -Operation $Operation -ConfigPath $ConfigPath -RunRoot $RunRoot
    }
    $result|ConvertTo-Json -Depth 50 -Compress
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
