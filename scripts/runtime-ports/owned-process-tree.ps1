$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -Path (Join-Path $PSScriptRoot 'owned-process-tree.cs') -ReferencedAssemblies System.Management
$Supervisor = New-Object D16OwnedE2E.Supervisor
[Console]::Out.WriteLine('{"ready":true}')
try {
    while ($null -ne ($Line = [Console]::ReadLine())) {
        $Request = $Line | ConvertFrom-Json
        try {
            $Result = $null
            switch ($Request.action) {
                'attach' { $Result = $Supervisor.Attach([int]$Request.pid, [string]$Request.token, [string]$Request.gate, [string]$Request.executable) }
                'snapshot' { $Result = @($Supervisor.Snapshot([string]$Request.token)) }
                'listeners' { $Result = @([D16OwnedE2E.Supervisor]::ListenerOwners([int]$Request.port)) }
                'stop' {
                    $Identities = @($Request.identities | ForEach-Object {
                        $Identity = New-Object D16OwnedE2E.Identity
                        $Identity.pid = [int]$_.pid
                        $Identity.parentPid = [int]$_.parentPid
                        $Identity.startTime = [string]$_.startTime
                        $Identity.command = [string]$_.command
                        $Identity.executable = [string]$_.executable
                        $Identity.token = [string]$_.token
                        $Identity
                    })
                    $Supervisor.Stop([string]$Request.token, [D16OwnedE2E.Identity[]]$Identities)
                }
                'close' { $Supervisor.Dispose() }
                default { throw 'Unknown supervisor request' }
            }
            [Console]::Out.WriteLine((@{id = $Request.id; result = $Result} | ConvertTo-Json -Depth 8 -Compress))
            if ($Request.action -eq 'close') { break }
        }
        catch {
            [Console]::Out.WriteLine((@{id = $Request.id; error = $_.Exception.Message} | ConvertTo-Json -Depth 8 -Compress))
        }
    }
}
finally { $Supervisor.Dispose() }
