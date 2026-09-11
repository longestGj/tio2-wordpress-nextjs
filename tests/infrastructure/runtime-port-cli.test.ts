import {randomUUID} from 'node:crypto'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {afterEach, describe, expect, test} from 'vitest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const cliPath = resolve(repositoryRoot, 'scripts/runtime-ports/cli.mjs')
const wrapperPath = resolve(repositoryRoot, 'scripts/runtime-ports.ps1')
const leaseRoots: string[] = []

function createLeaseRoot() {
  const leaseRoot = mkdtempSync(join(tmpdir(), 'runtime-port-cli-'))
  leaseRoots.push(leaseRoot)
  return leaseRoot
}

function runCli(args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
}

afterEach(() => {
  for (const leaseRoot of leaseRoots.splice(0)) {
    rmSync(leaseRoot, {recursive: true, force: true})
  }
})

describe('runtime port CLI', () => {
  test('every operator runbook npm command resolves to a package entry', () => {
    const runbookPath = resolve(repositoryRoot, 'docs/runtime-ports.md')
    expect(existsSync(runbookPath), 'The runtime ownership runbook must exist').toBe(true)
    const runbook = readFileSync(runbookPath, 'utf8')
    const {scripts} = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8')) as {scripts: Record<string, string>}
    const commands = [...runbook.matchAll(/npm run ([a-z0-9:-]+)/gu)].map(match => match[1])
    expect(commands).toEqual(expect.arrayContaining([
      'wordpress:start', 'sites:start', 'runtime:status', 'runtime:doctor', 'prerelease:status', 'test:e2e:owned',
    ]))
    expect([...new Set(commands)].filter(command => !scripts[command])).toEqual([])
  })

  test('the packaged runtime:doctor reads lease evidence without changing or releasing it', () => {
    const root = createLeaseRoot()
    const initialized = spawnSync('git', ['init', '--quiet', root], {encoding: 'utf8'})
    expect(initialized.status, initialized.stderr).toBe(0)
    const leaseRoot = join(root, '.runtime/port-leases')
    mkdirSync(leaseRoot, {recursive: true})
    const leaseId = randomUUID()
    const leasePath = join(leaseRoot, `${leaseId}.json`)
    const evidence = JSON.stringify({
      schemaVersion: 1, leaseId, runId: 'doctor-read-only', purpose: 'fixture', siteId: null,
      worktree: root, commit: 'a'.repeat(40), host: '127.0.0.1', ports: [32998], processIds: [],
      composeProject: null, createdAt: '2026-01-01T00:00:00.000Z', retainUntil: null,
    })
    writeFileSync(leasePath, evidence)
    const {scripts} = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8')) as {scripts: Record<string, string>}
    const [command, ...args] = scripts['runtime:doctor'].split(' ')
    const scriptArgument = args.indexOf('-File') + 1
    expect(scriptArgument).toBeGreaterThan(0)
    args[scriptArgument] = resolve(repositoryRoot, args[scriptArgument])
    const result = spawnSync(command, args, {cwd: root, encoding: 'utf8', timeout: 30000})

    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true, action: 'doctor', actionsTaken: [], leases: [{lease: {leaseId}}],
    })
    expect(readdirSync(leaseRoot)).toEqual([`${leaseId}.json`])
    expect(readFileSync(leasePath, 'utf8')).toBe(evidence)
  }, 35000)

  test('reserves a lease and emits one JSON response', () => {
    const leaseRoot = createLeaseRoot()
    const result = runCli([
      'reserve',
      '--lease-root', leaseRoot,
      '--purpose', 'feature-next',
      '--run-id', 'manual-review',
      '--site-id', 'tio2-my',
      '--worktree', repositoryRoot,
      '--commit', 'b'.repeat(40),
    ])

    expect(result.status, result.stderr).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout.trim().split(/\r?\n/u)).toHaveLength(1)
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      action: 'reserve',
      lease: {
        purpose: 'feature-next',
        runId: 'manual-review',
        siteId: 'tio2-my',
        worktree: repositoryRoot,
        commit: 'b'.repeat(40),
      },
    })
  })

  test.each([
    {
      label: 'missing required flags',
      args: ['reserve', '--purpose', 'feature-next'],
    },
    {
      label: 'an unknown flag',
      args: ['status', '--json', '--surprise', 'value'],
    },
    {
      label: 'a duplicate flag',
      args: ['status', '--json', '--json'],
    },
  ])('rejects $label as a usage error', ({args}) => {
    const result = runCli(args)

    expect(result.status).toBe(2)
    expect(result.stderr).toContain('INVALID_ARGUMENTS')
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      action: args[0],
      error: {code: 'INVALID_ARGUMENTS'},
    })
  })

  test('returns PORT_POOL_EXHAUSTED when every feature port is leased', () => {
    const leaseRoot = createLeaseRoot()
    const leaseId = randomUUID()
    writeFileSync(join(leaseRoot, `${leaseId}.json`), JSON.stringify({
      schemaVersion: 1,
      leaseId,
      runId: 'full-feature-pool',
      purpose: 'feature-next',
      siteId: null,
      worktree: repositoryRoot,
      commit: 'a'.repeat(40),
      host: '127.0.0.1',
      ports: Array.from({length: 100}, (_, index) => 32000 + index),
      processIds: [],
      composeProject: null,
      createdAt: '2026-09-11T00:00:00.000Z',
      retainUntil: '2099-01-01T00:00:00.000Z',
    }))

    const result = runCli([
      'reserve',
      '--lease-root', leaseRoot,
      '--purpose', 'feature-next',
      '--run-id', 'exhausted-attempt',
      '--worktree', repositoryRoot,
      '--commit', 'c'.repeat(40),
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('PORT_POOL_EXHAUSTED')
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      action: 'reserve',
      error: {code: 'PORT_POOL_EXHAUSTED'},
    })
  })

  test('attaches and releases a lease through the JSON command contract', () => {
    const leaseRoot = createLeaseRoot()
    const reserve = runCli([
      'reserve',
      '--lease-root', leaseRoot,
      '--purpose', 'test-next',
      '--run-id', 'attach-release',
      '--worktree', repositoryRoot,
      '--commit', 'e'.repeat(40),
    ])
    expect(reserve.status, reserve.stderr).toBe(0)
    const leaseId = JSON.parse(reserve.stdout).lease.leaseId

    const attach = runCli([
      'attach',
      '--lease-root', leaseRoot,
      '--lease-id', leaseId,
      '--process-id', process.pid.toString(),
      '--compose-project', 'cli-contract',
    ])
    expect(attach.status, attach.stderr).toBe(0)
    expect(JSON.parse(attach.stdout)).toMatchObject({
      ok: true,
      action: 'attach',
      lease: {leaseId, processIds: [process.pid], composeProject: 'cli-contract'},
    })

    const release = runCli([
      'release',
      '--lease-root', leaseRoot,
      '--lease-id', leaseId,
      '--process-id', process.pid.toString(),
      '--compose-project', 'cli-contract',
    ])
    expect(release.status, release.stderr).toBe(0)
    expect(JSON.parse(release.stdout)).toEqual({
      ok: true,
      action: 'release',
      released: true,
      leaseId,
    })
  })

  test('status --json emits lease diagnostics without prose or cleanup', () => {
    const leaseRoot = createLeaseRoot()
    const reserve = runCli([
      'reserve',
      '--lease-root', leaseRoot,
      '--purpose', 'feature-next',
      '--run-id', 'status-source',
      '--worktree', repositoryRoot,
      '--commit', 'd'.repeat(40),
    ])
    expect(reserve.status, reserve.stderr).toBe(0)
    const leaseId = JSON.parse(reserve.stdout).lease.leaseId

    const status = runCli(['status', '--lease-root', leaseRoot, '--json'])

    expect(status.status, status.stderr).toBe(0)
    expect(status.stderr).toBe('')
    expect(status.stdout.trim().split(/\r?\n/u)).toHaveLength(1)
    expect(JSON.parse(status.stdout)).toEqual({
      ok: true,
      action: 'status',
      leases: [{lease: expect.objectContaining({leaseId}), stale: true}],
    })
    const repeatedStatus = runCli(['status', '--lease-root', leaseRoot, '--json'])
    expect(repeatedStatus.status, repeatedStatus.stderr).toBe(0)
    expect(JSON.parse(repeatedStatus.stdout).leases).toEqual([
      {lease: expect.objectContaining({leaseId}), stale: true},
    ])
  })

  test('PowerShell Reserve -Json returns the Node CLI response schema', () => {
    const runId = `powershell-${randomUUID()}`
    const reserve = spawnSync('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', wrapperPath,
      '-Action', 'Reserve',
      '-Purpose', 'feature-next',
      '-RunId', runId,
      '-SiteId', 'tio2-my',
      '-Json',
    ], {cwd: repositoryRoot, encoding: 'utf8'})

    expect(reserve.status, reserve.stderr).toBe(0)
    expect(reserve.stderr).toBe('')
    expect(reserve.stdout.trim().split(/\r?\n/u)).toHaveLength(1)
    const response = JSON.parse(reserve.stdout)
    expect(response).toMatchObject({
      ok: true,
      action: 'reserve',
      lease: {runId, purpose: 'feature-next', siteId: 'tio2-my'},
    })

    const release = runCli(['release', '--lease-id', response.lease.leaseId])
    expect(release.status, release.stderr).toBe(0)
  })
})
