import {execFileSync} from 'node:child_process'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const verifier = resolve('scripts/verify-local.ps1')

describe.runIf(process.platform === 'win32')('local verification gate', () => {
  it('describes the complete deterministic gate without changing local state', () => {
    const output = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        verifier,
        '-Plan',
      ],
      {encoding: 'utf8'},
    )

    expect(JSON.parse(output)).toEqual({
      mode: 'plan',
      ports: [3001, 3002],
      gates: [
        'compose',
        'wordpress-smoke',
        'seed-audit',
        'lint',
        'typecheck',
        'codegen',
        'vitest',
        'vitest-live-seed',
        'build-tio2-a',
        'build-tio2-b',
        'launch',
        'playwright',
        'http-audit',
        'tracked-worktree',
      ],
    })
  })
})
