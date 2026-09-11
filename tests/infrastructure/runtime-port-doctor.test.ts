import {randomUUID} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const directories: string[] = []
const repositoryRoot = resolve('.')
function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'd16-doctor-'))
  directories.push(directory)
  return directory
}
const canonical = {project: 'wordpress', workingDir: join(repositoryRoot, 'wordpress'), configFiles: [resolve('wordpress/docker-compose.yml')]}
async function doctor(options: Record<string, unknown>) {
  const {doctorRuntime} = await import('../../scripts/runtime-ports/doctor.mjs')
  return doctorRuntime({repositoryRoot, leaseRoot: temporaryDirectory(), ...options})
}
afterEach(() => directories.splice(0).forEach(directory => rmSync(directory, {recursive: true, force: true})))

describe('read-only runtime Doctor', () => {
  it('reports all six fixed endpoints and recognizes canonical development CMS ownership', async () => {
    const report = await doctor({probePort: async (port: number) => port === 8080, dockerInspect: async () => [canonical]})
    expect(report.fixedEndpoints.map((item: {port: number}) => item.port)).toEqual([3001, 3002, 3003, 8080, 3100, 8180])
    expect(report.fixedEndpoints.find((item: {port: number}) => item.port === 8080)).toMatchObject({environment: 'development', service: 'wordpress', host: '127.0.0.1', state: 'expected-owner', owner: {project: 'wordpress'}})
    expect(report.actionsTaken).toEqual([])
  })

  it('does not create a missing lease directory', async () => {
    const leaseRoot = join(temporaryDirectory(), 'absent')
    await doctor({leaseRoot, probePort: async () => false, dockerInspect: async () => []})
    expect(existsSync(leaseRoot)).toBe(false)
  })

  it('reports an unknown listener without attributing it to an unrelated project', async () => {
    const report = await doctor({probePort: async () => true, dockerInspect: async () => []})
    expect(report.fixedEndpoints.every((item: {state: string}) => item.state === 'unknown-listener')).toBe(true)
    expect(report.actionsTaken).toEqual([])
  })

  it('rejects duplicate project labels originating in another checkout', async () => {
    const report = await doctor({probePort: async () => true, dockerInspect: async () => [canonical, {...canonical, workingDir: resolve('../other/wordpress')}]})
    expect(report.fixedEndpoints.find((item: {port: number}) => item.port === 8080)).toMatchObject({state: 'owner-mismatch'})
    expect(report.duplicateProjects).toContain('wordpress')
    expect(report.actionsTaken).toEqual([])
  })

  it('recognizes prerelease service ownership using its own Compose path', async () => {
    const report = await doctor({probePort: async () => true, dockerInspect: async () => [{project: 'd16-tio2-my-prerelease', workingDir: resolve('ops/prerelease'), configFiles: [resolve('ops/prerelease/docker-compose.yml')]}]})
    expect(report.fixedEndpoints.filter((item: {environment: string}) => item.environment === 'prerelease').map((item: {state: string}) => item.state)).toEqual(['expected-owner', 'expected-owner'])
  })

  it('keeps Docker and socket failures uncertain instead of reporting availability', async () => {
    const report = await doctor({probePort: async () => false, dockerInspect: async () => {throw new Error('offline')}})
    expect(report.docker.available).toBe(false)
    expect(report.fixedEndpoints.filter((item: {port: number}) => [8080, 3100, 8180].includes(item.port)).every((item: {state: string}) => item.state !== 'available')).toBe(true)
    const failedProbe = await doctor({probePort: async () => {throw new Error('denied')}, dockerInspect: async () => []})
    expect(failedProbe.fixedEndpoints.every((item: {state: string}) => item.state !== 'available')).toBe(true)
  })

  it('does not infer availability from an inconclusive port probe', async () => {
    const report = await doctor({probePort: async () => undefined, dockerInspect: async () => []})
    expect(report.fixedEndpoints.every((item: {state: string}) => item.state !== 'available')).toBe(true)
  })

  it('uses injected probes for stale leases and treats unavailable Docker lease ownership as uncertain', async () => {
    const leaseRoot = temporaryDirectory()
    const leaseId = randomUUID()
    writeFileSync(join(leaseRoot, `${leaseId}.json`), JSON.stringify({schemaVersion: 1, leaseId, runId: 'lease-probe', purpose: 'fixture', siteId: null, worktree: repositoryRoot, commit: 'a'.repeat(40), host: '127.0.0.1', ports: [32998], processIds: [], composeProject: null, createdAt: '2026-01-01T00:00:00.000Z', retainUntil: null}))
    const report = await doctor({leaseRoot, probePort: async (port: number) => port === 32998, dockerInspect: async () => []})
    expect(report.leases).toMatchObject([{stale: false}])
    const record = JSON.parse(readFileSync(join(leaseRoot, `${leaseId}.json`), 'utf8'))
    record.composeProject = 'isolated-test'
    writeFileSync(join(leaseRoot, `${leaseId}.json`), JSON.stringify(record))
    const unavailable = await doctor({leaseRoot, probePort: async () => false, dockerInspect: async () => {throw new Error('offline')}})
    expect(unavailable.leases).toMatchObject([{stale: false, evidenceIncomplete: true}])
  })

  it('dispatches Doctor through the JSON CLI without creating the requested lease root', () => {
    const leaseRoot = join(temporaryDirectory(), 'not-created')
    const result = spawnSync(process.execPath, [resolve('scripts/runtime-ports/cli.mjs'), 'doctor', '--json', '--lease-root', leaseRoot], {encoding: 'utf8', timeout: 30000})
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({ok: true, action: 'doctor', actionsTaken: []})
    expect(existsSync(leaseRoot)).toBe(false)
  }, 35000)

  it('reports stale lease evidence and preserves the record byte for byte', async () => {
    const leaseRoot = temporaryDirectory()
    const leaseId = randomUUID()
    const leasePath = join(leaseRoot, `${leaseId}.json`)
    const content = JSON.stringify({schemaVersion: 1, leaseId, runId: 'stale-doctor', purpose: 'fixture', siteId: null, worktree: repositoryRoot, commit: 'a'.repeat(40), host: '127.0.0.1', ports: [32998], processIds: [], composeProject: null, createdAt: '2026-01-01T00:00:00.000Z', retainUntil: null})
    writeFileSync(leasePath, content)
    const report = await doctor({leaseRoot, probePort: async () => false, dockerInspect: async () => []})
    expect(report.leases).toMatchObject([{lease: {leaseId}, stale: true}])
    expect(readFileSync(leasePath, 'utf8')).toBe(content)
    expect(report.actionsTaken).toEqual([])
  })
})
