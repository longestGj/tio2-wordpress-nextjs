#requires -Version 7.2
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Package','PackageContent','Test','Publish','Status','Prepare','Backup','Stage','Activate','Verify','Rollback')][string]$Operation,
    [string]$ConfigPath,
    [string]$RunRoot,
    [string]$PrereleaseReceiptPath,
    [string]$TestReceiptPath,
    [string]$PrereleaseRunRoot,
    [string]$BaselinePath,
    [string]$BaselineSha256,
    [string[]]$DevelopmentReceiptPath,
    [string]$ReleaseId,
    [string]$ContentPath,
    [string]$ContentPrereleasePath,
    [string]$CandidateMetadataPath,
    [string]$OutputPath,
    [string]$PythonExe='python'
)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'production/Production.Core.psm1') -Force
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
try {
    if($Operation -eq 'Package') {
        if(-not $PrereleaseReceiptPath -or -not $TestReceiptPath -or -not $PrereleaseRunRoot -or
           -not $BaselinePath -or -not $BaselineSha256 -or -not $DevelopmentReceiptPath -or -not $ReleaseId){
            throw 'Package requires PrereleaseReceiptPath, TestReceiptPath, PrereleaseRunRoot, BaselinePath, BaselineSha256, DevelopmentReceiptPath and ReleaseId.'
        }
        $arguments=@('-B',(Join-Path $PSScriptRoot 'production/package_frontend.py'),
            '--repository',$repository,'--gate',$PrereleaseReceiptPath,'--test',$TestReceiptPath,
            '--run',$PrereleaseRunRoot,'--baseline',$BaselinePath,'--baseline-sha256',$BaselineSha256,'--release-id',$ReleaseId)
        foreach($path in $DevelopmentReceiptPath){$arguments+=@('--development-receipt',$path)}
        $output=@(& $PythonExe @arguments)
        if($LASTEXITCODE -ne 0 -or $output.Count -ne 1){throw 'Frontend package preparation failed; no candidate was published.'}
        $result=$output[0]|ConvertFrom-Json -AsHashtable
    } elseif($Operation -eq 'PackageContent') {
        if(-not $ContentPath -or -not $ContentPrereleasePath -or -not $CandidateMetadataPath -or -not $OutputPath){throw 'ContentPath, ContentPrereleasePath, CandidateMetadataPath and OutputPath are required.'}
        $output=@(& python -B (Join-Path $PSScriptRoot 'production/prepare_content_candidate.py') --content $ContentPath --prerelease $ContentPrereleasePath --metadata $CandidateMetadataPath --output $OutputPath)
        if($LASTEXITCODE -ne 0 -or $output.Count -ne 1){throw 'Content candidate preparation failed.'}
        $result=$output[0]|ConvertFrom-Json -AsHashtable
    } elseif($Operation -eq 'Test') {
        $result=Invoke-D16ProductionOperation -Operation Test -RunRoot $RunRoot -ContentPath $ContentPath -PythonExe $PythonExe
    } else {
        if(-not $ConfigPath -or -not $RunRoot){throw 'ConfigPath and RunRoot are required.'}
        $result=Invoke-D16ProductionOperation -Operation $Operation -ConfigPath $ConfigPath -RunRoot $RunRoot
    }
    $result|ConvertTo-Json -Depth 50 -Compress
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
