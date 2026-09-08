import {execFileSync} from 'node:child_process'
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {expect, it} from 'vitest'

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
