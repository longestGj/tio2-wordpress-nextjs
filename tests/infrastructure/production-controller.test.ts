import {spawnSync} from 'node:child_process'
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {afterEach,expect,it} from 'vitest'
const roots:string[]=[]
const quote=(s:string)=>`'${s.replaceAll("'","''")}'`
function ps(code:string){return spawnSync('pwsh',['-NoProfile','-Command',`$ErrorActionPreference='Stop'; Import-Module ${quote(resolve('scripts/production/Production.Core.psm1'))} -Force; ${code}`],{encoding:'utf8'})}
afterEach(()=>roots.splice(0).forEach(p=>rmSync(p,{recursive:true,force:true})))
it('refuses invalid host pins and foreign site before starting a transport',()=>{
 const root=mkdtempSync(join(tmpdir(),'tio2-controller-identity-'));roots.push(root)
 const identity=join(root,'identity');writeFileSync(identity,'test-only')
 const valid={siteId:'tio2-my',host:'127.0.0.1',port:2222,username:'deploy',hostKey:'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZm',identityFile:identity,baselineSha256:'a'.repeat(64)}
 expect(ps(`Assert-ProductionConnection -Config (${quote(JSON.stringify(valid))}|ConvertFrom-Json)`).status).toBe(0)
 for(const override of [{siteId:'tio2-a'},{host:'bad;command'},{hostKey:'ssh-ed25519 invalid'},{username:'root'},{port:0},{baselineSha256:'invalid'},{identityFile:join(root,'missing')}]){
 const value={...valid,...override}
 const result=ps(`Assert-ProductionConnection -Config (${quote(JSON.stringify(value))}|ConvertFrom-Json)`)
 expect(result.status).not.toBe(0);expect(result.stderr).toContain('connection identity')
 }
},15000)
for(const port of [22,2222])it(`writes the OpenSSH host lookup name for port ${port}`,()=>{
 const root=controllerFixture()
 const config=JSON.parse(readFileSync(join(root,'config.json'),'utf8'));config.port=port
 const result=ps(`& (Get-Module Production.Core) {
 function script:ssh { $global:LASTEXITCODE=0; '{"action":"status","ok":true,"state":{"state":"IDLE"}}' }
 Invoke-ProductionTransport -Config (${quote(JSON.stringify(config))}|ConvertFrom-Json) -RunRoot ${quote(root)} -Kind action -Value status | Out-Null
 }`)
 expect(result.status,result.stderr).toBe(0)
 expect(readFileSync(join(root,'known_hosts'),'utf8')).toBe(`${port===22?'127.0.0.1':`[127.0.0.1]:${port}`} ${config.hostKey}\n`)
})
it('rejects wrong action, false ok and mismatched candidate receipts',()=>{
 for(const receipt of [{action:'prepare',ok:false,state:'PREPARED'},{action:'backup',ok:true,state:'PREPARED'},{action:'prepare',ok:true,state:'PREPARED',candidate:{commit:'c'.repeat(40),archiveSha256:'a'.repeat(64),manifestSha256:'b'.repeat(64),proofSha256:'d'.repeat(64)}}]){
 const result=ps(`Assert-ProductionActionReceipt -Action prepare -Receipt (${quote(JSON.stringify(receipt))}|ConvertFrom-Json) -Candidate @{commit='${'b'.repeat(40)}';archiveSha256='${'a'.repeat(64)}';manifestSha256='${'b'.repeat(64)}';proofSha256='${'d'.repeat(64)}'}`)
 expect(result.status).not.toBe(0);expect(result.stderr).toContain('receipt')
 }
})
it('persists one exact request before dispatch and refuses changed baseline on retry',()=>{
 const root=mkdtempSync(join(tmpdir(),'tio2-controller-'));roots.push(root)
 const command=`Get-ProductionBackupRequest -RunRoot ${quote(root)} -ProofSha256 '${'a'.repeat(64)}' -BaselineSha256 '${'b'.repeat(64)}' | ConvertTo-Json -Compress`
 const first=ps(command);expect(first.status,first.stderr).toBe(0)
 const before=readFileSync(join(root,'backup-request.json'))
 const second=ps(command);expect(second.status,second.stderr).toBe(0)
 expect(readFileSync(join(root,'backup-request.json'))).toEqual(before)
 expect(JSON.parse(first.stdout).requestId).toMatch(/^[0-9a-f-]{36}$/)
 expect(ps(command.replace(`'${'b'.repeat(64)}'`,`'${'c'.repeat(64)}'`)).status).not.toBe(0)
})
it('refuses a completion claim with missing decryption or restore records',()=>{
 const root=mkdtempSync(join(tmpdir(),'tio2-controller-'));roots.push(root)
 const result=ps(`New-ProductionDeploymentEvidence -RunRoot ${quote(root)} -Prepared @{} -Backup @{}`)
 expect(result.status).not.toBe(0);expect(result.stderr).toContain('recovery evidence')
})
import {createHash} from 'node:crypto'
function controllerFixture(){
 const root=mkdtempSync(join(tmpdir(),'tio2-controller-flow-'));roots.push(root)
 writeFileSync(join(root,'identity'),'test-only')
 const h=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex')
 const archive=Buffer.from('local package');writeFileSync(join(root,'release.tar.gz'),archive)
 const manifest={siteId:'tio2-my',commit:'b'.repeat(40),archiveSha256:h(archive)}
 writeFileSync(join(root,'release-manifest.json'),JSON.stringify(manifest))
 const proof={commit:manifest.commit,archiveSha256:manifest.archiveSha256,manifestSha256:h(JSON.stringify(manifest))}
 writeFileSync(join(root,'release-proof.json'),JSON.stringify(proof))
 const config={siteId:'tio2-my',host:'127.0.0.1',port:22222,username:'deploy',hostKey:'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZm',identityFile:join(root,'identity'),baselineSha256:'c'.repeat(64)}
 writeFileSync(join(root,'config.json'),JSON.stringify(config))
 return root
}
for(const fault of ['disconnect','wrong-backup','restore-failed'])it(`stops before deploy on ${fault} and resumes with the same request bytes`,()=>{
 const root=controllerFixture()
 const inject=`& (Get-Module Production.Core) {
 $script:root=${quote(root)}; $script:fault=${quote(fault)}
 $m=Read-ProductionJson (Join-Path $script:root 'release-manifest.json')
 $script:candidate=@{commit=$m.commit;archiveSha256=$m.archiveSha256;manifestSha256=Get-ProductionSha256 (Join-Path $script:root 'release-manifest.json');proofSha256=Get-ProductionSha256 (Join-Path $script:root 'release-proof.json')}
 $script:active=@{enrollmentSha256='${'c'.repeat(64)}';sourceSha256='${'d'.repeat(64)}'}
 function script:Invoke-ProductionTransport($Config,$RunRoot,$Kind,$Value){
 if($Kind -eq 'download'){[IO.File]::WriteAllText((Join-Path $script:root 'ciphertext.age.part'),'ciphertext');return}
 if($Kind -ne 'action'){return}
 Add-Content (Join-Path $script:root 'calls.txt') $Value
 if($Value -eq 'status'){return @{action='status';ok=$true;state=@{state='PREPARED';details=@{candidate=$script:candidate;active=$script:active}}}}
 if($Value -eq 'backup'){
 if($script:fault -eq 'disconnect'){throw 'fixture disconnect'}
 $r=Read-ProductionJson (Join-Path $script:root 'backup-request.json')
 if($script:fault -eq 'wrong-backup'){$r.requestId='wrong'}
 return @{action='backup';ok=$true;state='BACKED_UP';requestId=$r.requestId;backupId='20260911T000000Z-${'a'.repeat(40)}-${'b'.repeat(32)}';ciphertextSha256='${createHash('sha256').update('ciphertext').digest('hex')}';manifestSha256='${'f'.repeat(64)}';writesResumed=$true;autoRestoreEligible=$false}
 }
 throw 'unexpected action'
 }
 function script:Invoke-ProductionRecovery {throw 'fixture restore failed'}
 }
 Invoke-ProductionOperation -Operation Release -ConfigPath ${quote(join(root,'config.json'))} -RunRoot ${quote(root)}`
 const first=ps(inject);expect(first.status).not.toBe(0)
 expect(first.stderr).toContain(fault==='disconnect'?'fixture disconnect':fault==='wrong-backup'?'Backup receipt identity mismatch':'fixture restore failed')
 const before=readFileSync(join(root,'backup-request.json'))
 expect(ps(inject).status).not.toBe(0)
 expect(readFileSync(join(root,'backup-request.json'))).toEqual(before)
 expect(readFileSync(join(root,'calls.txt'),'utf8')).not.toContain('deploy')
})
