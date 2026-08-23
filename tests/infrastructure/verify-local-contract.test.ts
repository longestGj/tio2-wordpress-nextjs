import {execFileSync, spawnSync} from 'node:child_process'
import {rmSync, writeFileSync} from 'node:fs'
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
      controller: {
        healthTimeoutSeconds: 120,
        maximumSequentialHealthWaitSeconds: 240,
        parentTimeoutSeconds: 270,
        cancellationGraceSeconds: 30,
        forceKillOnTimeout: false,
        cleanupWithoutEmittedState: true,
      },
      worktree: {
        requireCleanAtStart: true,
        requireCleanAtEnd: true,
        includeUntracked: true,
      },
      liveSeed: {
        restoreInFinally: true,
        auditAfterRestore: true,
        preservePrimaryFailure: true,
      },
    })
  })

  it('rejects an untracked file by its exact path', () => {
    const probeName = `verify-untracked-probe-${process.pid}.txt`
    const probePath = resolve(probeName)
    writeFileSync(probePath, 'untracked verification probe')

    try {
      const result = spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          verifier,
          '-CheckWorktree',
        ],
        {encoding: 'utf8'},
      )

      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain(probeName)
    } finally {
      rmSync(probePath, {force: true})
    }
  })
})
