import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'

const script=readFileSync('scripts/production-adoption.ps1','utf8')

it('stages the complete release and administrator payload in one fixed upload batch',()=>{
  expect(script).toContain("@('release.tar.gz','release-manifest.json','release-proof.json','admin-bundle.tar.gz','admin-bundle-manifest.json','backup.age.pub')")
  expect(script).toContain('uploadedFiles=6')
  expect(script).toContain('New-ProductionPackage')
  expect(script).toContain('build_adoption_archive.py')
  expect(script).not.toMatch(/deploy@.*sudo/)
})

it('pins the one-time target and never accepts a caller-selected remote path',()=>{
  expect(script).toContain("$Config.host -cne '129.146.68.82'")
  expect(script).toContain("$Config.username -cne 'deploy'")
  expect(script).toContain('/home/deploy/tio2-incoming')
  expect(script).toContain('/root/tio2-adoption-')
  expect(script).not.toMatch(/RemotePath|ContainerName|ComposePath/)
})
