import {execFile} from 'node:child_process'
import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'
import {createServer, type Server} from 'node:net'
import {expect, test} from 'vitest'
import {resolveLeaseRoot} from '../../scripts/runtime-ports/lease-root.mjs'
import {doctorRuntime} from '../../scripts/runtime-ports/doctor.mjs'

const exec = promisify(execFile)
const cli = resolve('scripts/runtime-ports/cli.mjs')

test('concurrent worktrees reserve distinct default ports before either binds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'd16-common-registry-'))
  const git = (args: string[]) => exec('git', args, {cwd: root, windowsHide: true})
  const command = async (cwd: string, args: string[]) => JSON.parse((await exec(process.execPath, [cli, ...args], {cwd, windowsHide: true})).stdout)
  const leases: {cwd: string; id: string}[] = []
  const servers: Server[] = []
  try {
    await git(['init', '-q'])
    await git(['-c', 'user.name=Runtime Test', '-c', 'user.email=runtime@example.invalid', 'commit', '--allow-empty', '-qm', 'test'])
    const a = join(root, 'a'), b = join(root, 'b')
    await git(['worktree', 'add', '--detach', a, 'HEAD'])
    await git(['worktree', 'add', '--detach', b, 'HEAD'])
    const reservations = await Promise.all([a, b].map(async (cwd, index) => {
      const result = await command(cwd, ['reserve', '--purpose', 'test-next', '--run-id', `prebind-${index}`])
      leases.push({cwd, id: result.lease.leaseId})
      return result.lease
    }))
    expect(reservations[0].ports[0]).not.toBe(reservations[1].ports[0])
    expect(reservations.map(lease => lease.worktree.replaceAll('\\', '/'))).toEqual([a, b].map(path => path.replaceAll('\\', '/')))
    for (const cwd of [root, a, b]) expect((await command(cwd, ['status'])).leases).toHaveLength(2)
    const doctor = await doctorRuntime({repositoryRoot: b, dockerInspect: async () => [], probePort: async () => false})
    expect(doctor.leases).toHaveLength(2)
    expect(doctor.actionsTaken).toEqual([])
    const powershell = await exec('powershell.exe', ['-NoProfile', '-File', resolve('scripts/runtime-ports.ps1'), '-Action', 'Status', '-Json'], {cwd: a, windowsHide: true})
    expect(JSON.parse(powershell.stdout).leases).toHaveLength(2)
    // Both reservations are complete before either runtime can bind. Starting
    // both listeners now must succeed without another allocator or fallback.
    await Promise.all(reservations.map(async lease => {
      const server = createServer(); servers.push(server)
      await new Promise<void>((done, reject) => {
        server.once('error', reject); server.listen(lease.ports[0], '127.0.0.1', done)
      })
    }))
    expect(servers.every(server => server.listening)).toBe(true)
  } finally {
    for (const server of servers) if (server.listening) await new Promise<void>(done => server.close(() => done()))
    for (const lease of leases) await command(lease.cwd, ['release', '--lease-id', lease.id])
    await rm(root, {recursive: true, force: true})
  }
}, 15_000)

test('non-Git projects remain local and explicit test roots do not fragment Git defaults', async () => {
  const root = await mkdtemp(join(tmpdir(), 'd16-nongit-registry-'))
  try {
    expect(resolveLeaseRoot(root)).toBe(join(root, '.runtime/port-leases'))
    const reserve = async (extra: string[]) => JSON.parse((await exec(process.execPath, [cli, 'reserve', '--purpose', 'test-next', '--run-id', 'non-git', '--worktree', root, '--commit', 'b'.repeat(40), ...extra], {cwd: root, windowsHide: true})).stdout)
    const normal = await reserve([])
    const override = await reserve(['--lease-root', join(root, 'injected')])
    const status = async (extra: string[]) => JSON.parse((await exec(process.execPath, [cli, 'status', ...extra], {cwd: root, windowsHide: true})).stdout)
    expect((await status([])).leases.map((entry: {lease: {leaseId: string}}) => entry.lease.leaseId)).toEqual([normal.lease.leaseId])
    expect((await status(['--lease-root', join(root, 'injected')])).leases.map((entry: {lease: {leaseId: string}}) => entry.lease.leaseId)).toEqual([override.lease.leaseId])
  } finally { await rm(root, {recursive: true, force: true}) }
})
