import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {dirname, join, relative, resolve} from 'node:path'

import {describe, expect, it} from 'vitest'

describe('Vitest repository discovery', () => {
  it('does not discover tests from ignored Git worktrees', () => {
    const repositoryRoot = process.cwd()
    const worktreeRoot = resolve(repositoryRoot, '.worktrees')
    const probeRoot = mkdtempSync(join(worktreeRoot, 'vitest-exclusion-probe-'))
    const probePath = join(probeRoot, 'tests', 'probe.test.ts')

    try {
      mkdirSync(dirname(probePath), {recursive: true})
      writeFileSync(
        probePath,
        "import {it} from 'vitest'; it('probe', () => {})\n",
        'utf8',
      )

      const result = spawnSync(
        process.execPath,
        [
          resolve(repositoryRoot, 'node_modules/vitest/vitest.mjs'),
          'list',
          '--filesOnly',
        ],
        {cwd: repositoryRoot, encoding: 'utf8'},
      )
      const normalizedOutput = result.stdout.replaceAll('\\', '/')
      const normalizedProbePath = relative(repositoryRoot, probePath).replaceAll(
        '\\',
        '/',
      )

      expect(result.status, result.stderr).toBe(0)
      expect(normalizedOutput).not.toContain(normalizedProbePath)
    } finally {
      rmSync(probeRoot, {recursive: true, force: true})
    }
  })

  it('does not lint files from ignored Git worktrees', () => {
    const repositoryRoot = process.cwd()
    const worktreeRoot = resolve(repositoryRoot, '.worktrees')
    const probeRoot = mkdtempSync(join(worktreeRoot, 'eslint-exclusion-probe-'))
    const probePath = join(probeRoot, 'invalid.js')

    try {
      writeFileSync(probePath, 'const invalid =\n', 'utf8')

      const result = spawnSync(
        process.execPath,
        [
          resolve(repositoryRoot, 'node_modules/eslint/bin/eslint.js'),
          probePath,
          '--no-warn-ignored',
        ],
        {cwd: repositoryRoot, encoding: 'utf8'},
      )

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    } finally {
      rmSync(probeRoot, {recursive: true, force: true})
    }
  }, 60_000)
})
