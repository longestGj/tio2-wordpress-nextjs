import {spawnSync} from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {afterEach, describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const helperPath = join(repositoryRoot, 'scripts', 'root-only-evidence-paths.ps1')
const evidenceRoot = join(repositoryRoot, '.local-evidence')
const cleanupPaths: string[] = []

function quoted(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function invokeHelper(command: string) {
  const failClosedCommand = command.replace('& {', "& { $ErrorActionPreference = 'Stop';")
  return spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', failClosedCommand],
    {cwd: repositoryRoot, encoding: 'utf8'},
  )
}

afterEach(() => {
  for (const path of cleanupPaths.splice(0).reverse()) {
    rmSync(path, {recursive: true, force: true})
  }
})

describe('root-only evidence path behavior', () => {
  it('resolves an ordinary existing file inside the real evidence root', () => {
    mkdirSync(evidenceRoot, {recursive: true})
    const local = mkdtempSync(join(evidenceRoot, 'safe-probe-'))
    cleanupPaths.push(local)
    const snapshotPath = join(local, 'snapshot.json')
    writeFileSync(snapshotPath, '{}', 'utf8')

    const result = invokeHelper(
      `& { . ${quoted(helperPath)}; Resolve-Tio2SafeLocalPath -Path ${quoted(snapshotPath)} -AllowedRoot ${quoted(evidenceRoot)} -MustExist }`,
    )

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout.trim()).toBe(snapshotPath)
  })

  it('rejects a junction escape anywhere below the real evidence root', () => {
    mkdirSync(evidenceRoot, {recursive: true})
    const local = mkdtempSync(join(evidenceRoot, 'path-probe-'))
    const external = mkdtempSync(join(tmpdir(), 'tio2-evidence-escape-'))
    cleanupPaths.push(external, local)
    const junction = join(local, 'escape')
    symlinkSync(external, junction, 'junction')
    const escapedFile = join(junction, 'snapshot.json')
    writeFileSync(join(external, 'snapshot.json'), '{}')

    const result = invokeHelper(
      `& { . ${quoted(helperPath)}; Resolve-Tio2SafeLocalPath -Path ${quoted(escapedFile)} -AllowedRoot ${quoted(evidenceRoot)} -MustExist }`,
    )

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/reparse point/i)
  })

  it('creates snapshot evidence exclusively and never overwrites an existing file', () => {
    mkdirSync(evidenceRoot, {recursive: true})
    const local = mkdtempSync(join(evidenceRoot, 'exclusive-probe-'))
    cleanupPaths.push(local)
    const snapshotPath = join(local, 'snapshot.json')
    writeFileSync(snapshotPath, 'original', 'utf8')

    const result = invokeHelper(
      `& { . ${quoted(helperPath)}; Write-Tio2ExclusiveUtf8File -Path ${quoted(snapshotPath)} -Content 'replacement' }`,
    )

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/already exists|exclusive/i)
    expect(readFileSync(snapshotPath, 'utf8')).toBe('original')
  })
})
