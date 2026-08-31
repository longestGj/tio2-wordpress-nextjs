import {spawnSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
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
      'NEXTJS_REVALIDATION_SECRET_TIO2_MY',
      'NEXTJS_PREVIEW_SECRET_TIO2_A',
      'NEXTJS_PREVIEW_SECRET_TIO2_B',
      'NEXTJS_PREVIEW_SECRET_TIO2_MY',
    ]
    const secrets = secretNames.map((name) => values[name])

    expect(values.WORDPRESS_ADMIN_USER).not.toBe('admin')
    expect(secrets.every((value) => /^[0-9a-f]{64}$/u.test(value))).toBe(true)
    expect(new Set(secrets).size).toBe(secretNames.length)
  })

  it('rotates a legacy environment without replacing its database or URL settings', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tio2-wordpress-env-rotate-'))
    temporaryDirectories.push(directory)
    const outputPath = join(directory, '.env')
    const legacySecret = 'legacy-predictable-secret'
    writeFileSync(
      outputPath,
      [
        'WORDPRESS_DB_NAME=retained_database',
        'WORDPRESS_DB_USER=retained_user',
        'WORDPRESS_DB_PASSWORD=retained_database_password',
        'WORDPRESS_DB_ROOT_PASSWORD=retained_root_password',
        'WORDPRESS_ADMIN_USER=admin',
        `WORDPRESS_ADMIN_PASSWORD=${legacySecret}`,
        'WORDPRESS_ADMIN_EMAIL=retained@example.test',
        'NEXTJS_REVALIDATION_URL_TIO2_A=http://host.docker.internal:3001/api/revalidate',
        `NEXTJS_REVALIDATION_SECRET_TIO2_A=${legacySecret}`,
        'NEXTJS_REVALIDATION_URL_TIO2_B=http://host.docker.internal:3002/api/revalidate',
        `NEXTJS_REVALIDATION_SECRET_TIO2_B=${legacySecret}`,
        'NEXTJS_PREVIEW_URL_TIO2_A=http://127.0.0.1:3001/api/preview',
        `NEXTJS_PREVIEW_SECRET_TIO2_A=${legacySecret}`,
        'NEXTJS_PREVIEW_URL_TIO2_B=http://127.0.0.1:3002/api/preview',
        `NEXTJS_PREVIEW_SECRET_TIO2_B=${legacySecret}`,
      ].join('\n'),
    )

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
        '-Force',
      ],
      {encoding: 'utf8'},
    )

    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).not.toContain(legacySecret)
    const output = readFileSync(outputPath, 'utf8')
    expect(output).toContain('WORDPRESS_DB_NAME=retained_database')
    expect(output).toContain('WORDPRESS_DB_PASSWORD=retained_database_password')
    expect(output).toContain('WORDPRESS_ADMIN_EMAIL=retained@example.test')
    expect(output).toContain('WORDPRESS_ADMIN_USER=tio2-local-editor')
    expect(output).not.toContain(legacySecret)
  })

  it('rejects a legacy environment without echoing its credential', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tio2-wordpress-env-invalid-'))
    temporaryDirectories.push(directory)
    const environmentPath = join(directory, '.env')
    const legacySecret = 'legacy-secret-must-not-be-printed'
    writeFileSync(
      environmentPath,
      `WORDPRESS_ADMIN_USER=admin\nWORDPRESS_ADMIN_PASSWORD=${legacySecret}\n`,
    )

    const result = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        resolve('scripts/assert-local-wordpress-env.ps1'),
        '-EnvironmentPath',
        environmentPath,
      ],
      {encoding: 'utf8'},
    )

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain(
      'generated 64-hex credentials',
    )
    expect(`${result.stdout}${result.stderr}`).not.toContain(legacySecret)
  })
})
