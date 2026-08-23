import {spawnSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {recursive: true, force: true})
  }
})

describe.runIf(process.platform === 'win32')('local WordPress env generator', () => {
  it('writes unique generated admin and per-site secrets without printing them', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tio2-wordpress-env-'))
    temporaryDirectories.push(directory)
    const outputPath = join(directory, '.env')
    const result = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        resolve('scripts/new-local-wordpress-env.ps1'),
        '-OutputPath',
        outputPath,
      ],
      {encoding: 'utf8'},
    )

    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).not.toMatch(/[0-9a-f]{64}/u)
    const values = Object.fromEntries(
      readFileSync(outputPath, 'utf8')
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line) => {
          const separator = line.indexOf('=')
          return [line.slice(0, separator), line.slice(separator + 1)]
        }),
    )
    const secretNames = [
      'WORDPRESS_ADMIN_PASSWORD',
      'NEXTJS_REVALIDATION_SECRET_TIO2_A',
      'NEXTJS_REVALIDATION_SECRET_TIO2_B',
      'NEXTJS_PREVIEW_SECRET_TIO2_A',
      'NEXTJS_PREVIEW_SECRET_TIO2_B',
    ]
    const secrets = secretNames.map((name) => values[name])

    expect(values.WORDPRESS_ADMIN_USER).not.toBe('admin')
    expect(secrets.every((value) => /^[0-9a-f]{64}$/u.test(value))).toBe(true)
    expect(new Set(secrets).size).toBe(secretNames.length)
  })
})
