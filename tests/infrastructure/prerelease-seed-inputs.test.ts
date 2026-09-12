import {execFileSync, spawnSync} from 'node:child_process'
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {expect, it} from 'vitest'

it.each(['success', 'failed', 'unverified', 'unexpected-output'] as const)(
  'records the final route seed only after verified successful execution: %s', (scenario) => {
    const script = readFileSync('ops/prerelease/bootstrap-wordpress.sh', 'utf8').replaceAll('\r\n', '\n')
    const tail = script.split('done < "$verified"\n')[1].split('wp eval-file /workspace/wordpress/bootstrap/validate-prerelease-site.php')[0]
    const root = mkdtempSync(join(tmpdir(), 'd16-route-ledger-'))
    const path = 'wordpress/seed/apply-tio2-my-prerelease-public-paths.php'
    const hash = 'a'.repeat(64)
    const payload = '{"candidateId":"TIO2-MY-PRERELEASE-PUBLIC-PATHS-2026-09-09-V1","state":"APPLIED","routeCount":42}'
    try {
      const verified = join(root, 'verified.tsv').replaceAll('\\', '/')
      writeFileSync(verified, scenario === 'unverified' ? '' : `${path}\t${hash}\n`)
      const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
      const result = spawnSync(bash, ['-c', `set -euo pipefail
verified="$1"
wp() {
  echo executed >&2
  if [[ "$2" != /workspace/${path} ]]; then return 9; fi
  if [[ "$SCENARIO" == failed ]]; then return 7; fi
  if [[ "$SCENARIO" == unexpected-output ]]; then echo unknown; else
    printf '%s\\n' 'TIO2_MY_PRERELEASE_PUBLIC_PATHS_RESULT ${payload}'
  fi
}
record_seed_result() { printf 'record:%s|%s|%s\\n' "$1" "$2" "$3"; }
${tail}
echo validated`, 'test', verified], {encoding: 'utf8', env: {...process.env, SCENARIO: scenario}})
      if (scenario === 'success') {
        expect(result.status).toBe(0)
        expect(result.stdout).toContain(`record:${path}|${hash}|${payload}`)
        expect(result.stdout.indexOf('record:')).toBeLessThan(result.stdout.indexOf('validated'))
      } else {
        expect(result.status).not.toBe(0)
        expect(result.stdout).not.toContain('record:')
        expect(result.stdout).not.toContain('validated')
        if (scenario === 'unverified') expect(result.stderr).not.toContain('executed')
      }
    } finally { rmSync(root, {recursive: true, force: true}) }
  },
)

it('invalidates seed reuse when its external contract changes while the seed script stays unchanged', () => {
  const script=readFileSync('ops/prerelease/bootstrap-wordpress.sh','utf8')
  const fn=script.match(/seed_input_fingerprint\(\) \{[\s\S]*?\n\}/)?.[0]
  expect(fn).toBeDefined()
  const root=mkdtempSync(join(tmpdir(),'d16-seed-inputs-'))
  try {
    const config=join(root,'wordpress/plugins/tio2-site-model/config')
    const seeds=join(root,'wordpress/seed')
    mkdirSync(config,{recursive:true});mkdirSync(seeds,{recursive:true})
    writeFileSync(join(seeds,'apply.php'),'<?php /* reads approved.json */')
    writeFileSync(join(config,'approved.json'),'{"revision":1}')
    const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash'
    const hash=()=>execFileSync(bash,['-c',`${fn}\nseed_input_fingerprint "$1"`,'test',root.replaceAll('\\','/')],{encoding:'utf8'}).trim()
    const first=hash();expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(hash()).toBe(first)
    writeFileSync(join(config,'approved.json'),'{"revision":2}')
    expect(hash()).not.toBe(first)
    expect(script).toContain('"$previous_input_hash" == "$input_hash"')
  } finally {rmSync(root,{recursive:true,force:true})}
})

it('does not fail a repeated start when WP-CLI rejects an unchanged option update', () => {
  const script=readFileSync('ops/prerelease/bootstrap-wordpress.sh','utf8').replaceAll('\r\n','\n')
  const update=script.split('> /run-state/site-validation.json\n')[1].split('printf')[0]
  const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash'
  const output=execFileSync(bash,['-c',`set -e\nprevious_input_hash=unchanged\ninput_hash=unchanged\nwp() { return 1; }\n${update}\necho retained`],{encoding:'utf8'})
  expect(output.trim()).toBe('retained')
})

it('does not repeat an unchanged editorial task marker update during a successor refresh',()=>{
 const script=readFileSync('ops/prerelease/bootstrap-wordpress.sh','utf8').replaceAll('\r\n','\n')
 const block=script.match(/  case "\$seed_path" in[\s\S]*?\n  esac/)![0]
 const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash'
 const output=execFileSync(bash,['-c',`set -e\nseed_path=wordpress/seed/apply-tio2-my-editorial-five.php\nwp() { if [[ "$1 $2" == 'option get' ]]; then echo G8-DE-IT-SU-R706-CHEMOURS-20260908-01; else return 1; fi; }\n${block}\necho retained`],{encoding:'utf8'})
 expect(output.trim()).toBe('retained')
})
