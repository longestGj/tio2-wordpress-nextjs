import {
  mkdtempSync,
  mkdirSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {dirname, join, relative, resolve} from 'node:path'

import {describe, expect, it} from 'vitest'

function removeCreatedWorktreeRootIfEmpty(worktreeRoot: string): void {
  try {
    rmdirSync(worktreeRoot)
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : ''
    if (code !== 'ENOENT' && code !== 'ENOTEMPTY') throw error
  }
}

function createWorktreeProbe(prefix: string): {
  probeRoot: string
  cleanup: () => void
} {
  const worktreeRoot = resolve(process.cwd(), '.worktrees')
  const createdWorktreeRoot =
    mkdirSync(worktreeRoot, {recursive: true}) !== undefined

  try {
    const probeRoot = mkdtempSync(join(worktreeRoot, prefix))
    return {
      probeRoot,
      cleanup: () => {
        rmSync(probeRoot, {recursive: true, force: true})
        if (!createdWorktreeRoot) return
        removeCreatedWorktreeRootIfEmpty(worktreeRoot)
      },
    }
  } catch (error) {
    if (createdWorktreeRoot) removeCreatedWorktreeRootIfEmpty(worktreeRoot)
    throw error
  }
}

describe('Vitest repository discovery', () => {
  it('does not discover tests from ignored Git worktrees', () => {
    const repositoryRoot = process.cwd()
    const {probeRoot, cleanup} = createWorktreeProbe(
      'vitest-exclusion-probe-',
    )
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
      cleanup()
    }
  })

  it('does not lint files from ignored Git worktrees', () => {
    const repositoryRoot = process.cwd()
    const {probeRoot, cleanup} = createWorktreeProbe(
      'eslint-exclusion-probe-',
    )
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
      cleanup()
    }
  }, 60_000)
})
