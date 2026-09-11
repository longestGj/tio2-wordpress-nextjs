import {execFileSync, spawn, spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const modulePath = resolve('scripts/production/Production.Core.psm1')
const contractRoot = resolve('ops/production')
const temporaryDirectories: string[] = []

type PackageResult = {
  releaseId: string
  commit: string
  archivePath: string
  archiveSha256: string
  manifestPath: string
  manifestSha256: string
  proofPath: string
  proofSha256: string
}

const psQuote = (value: string) => `'${value.replaceAll("'", "''")}'`
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex')

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

function git(repository: string, arguments_: string[]): string {
  return execFileSync('git', arguments_, {cwd: repository, encoding: 'utf8'}).trim()
}

type FixtureOptions = {
  mutateContracts?: (repository: string) => void
  trackedReceiverEvidence?: boolean
  unsafeSymlink?: boolean
  largeRuntimeBytes?: number
}

function receiptFor(commit: string, override: Record<string, unknown> = {}) {
  return {
    schemaVersion: 'tio2-prerelease-production-gate-v1',
    state: 'PASSED',
    commit,
    siteId: 'tio2-my',
    runId: 'candidate-1',
    buildId: 'build-candidate-1',
    cmsIdentitySha256: 'a'.repeat(64),
    releaseSurfaceSha256: '42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152',
    sealedAt: '2026-09-10T00:00:00.000Z',
    counts: {businessPages: 56, registeredObjects: 58, widths: 3, browserCases: 174},
    forms: {rfq: 'RECEIVED', sample: 'RECEIVED', documents: 'RECEIVED'},
    evidenceSha256: {test: 'b'.repeat(64), liveForms: 'c'.repeat(64), inbox: 'd'.repeat(64)},
    ...override,
  }
}

function createRepository(options: FixtureOptions = {}): {repository: string; receiptPath: string; commit: string} {
  const repository = temporaryDirectory('d16-production-package-')
  git(repository, ['init', '-b', 'main'])
  git(repository, ['config', 'user.name', 'Package Test'])
  git(repository, ['config', 'user.email', 'package-test@example.test'])
  git(repository, ['config', 'core.autocrlf', 'false'])
  git(repository, ['config', 'core.symlinks', 'false'])
  cpSync(contractRoot, join(repository, 'ops', 'production'), {recursive: true})
  // The production freeze is over LF Git blobs, not a CRLF Windows checkout.
  for (const name of ['release-package.schema.json', 'release-surface.json', 'migration-manifest.json']) {
    const file = join(repository, 'ops', 'production', name)
    writeFileSync(file, readFileSync(file, 'utf8').replaceAll('\r\n', '\n'))
  }
  const migration = JSON.parse(readFileSync(join(contractRoot, 'migration-manifest.json'), 'utf8')) as {seeds: Array<{path: string}>}
  for (const seed of migration.seeds) {
    const target = join(repository, seed.path)
    mkdirSync(dirname(target), {recursive: true})
    writeFileSync(target, execFileSync('git', ['show', `HEAD:${seed.path}`]))
  }
  options.mutateContracts?.(repository)
  writeFileSync(join(repository, '.gitignore'), '.prerelease/\n.production/\n.env\nignored.txt\n')
  mkdirSync(join(repository, 'app'), {recursive: true})
  writeFileSync(join(repository, 'app', 'application.txt'), 'committed application bytes\n')
  if (options.largeRuntimeBytes) writeFileSync(join(repository, 'app', 'large-runtime.bin'), Buffer.alloc(options.largeRuntimeBytes, 7))
  if (options.trackedReceiverEvidence) {
    mkdirSync(join(repository, 'docs', 'verification'), {recursive: true})
    writeFileSync(join(repository, 'docs', 'verification', 'receiver-payload.json'), '{"receiver":"receiver-private-payload"}\n')
  }
  writeFileSync(join(repository, '.env'), 'DATABASE_PASSWORD=database-secret\n')
  writeFileSync(join(repository, 'ignored.txt'), 'database-secret\n')
  git(repository, ['add', '.gitignore', 'app', 'ops/production', 'wordpress/seed'])
  if (options.trackedReceiverEvidence) git(repository, ['add', 'docs'])
  if (options.unsafeSymlink) {
    const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], {cwd: repository, input: '../outside-private.txt\n', encoding: 'utf8'}).trim()
    git(repository, ['update-index', '--add', '--cacheinfo', `120000,${blob},app/escape-link`])
  }
  git(repository, ['commit', '-m', 'release candidate'])
  if (options.unsafeSymlink) git(repository, ['checkout', '--', 'app/escape-link'])
  const commit = git(repository, ['rev-parse', 'HEAD'])
  const receiptPath = join(repository, '.prerelease', 'runs', 'candidate-1', 'production-receipt.json')
  mkdirSync(join(repository, '.prerelease', 'runs', 'candidate-1'), {recursive: true})
  writeFileSync(receiptPath, JSON.stringify(receiptFor(commit)))
  return {repository, receiptPath, commit}
}

function packageCommand(repository: string, outputRoot: string, receiptPath: string, releaseId?: string): string {
  return [
    "$ErrorActionPreference='Stop'",
    `Import-Module ${psQuote(modulePath)} -Force`,
    `$result=New-ProductionPackage -RepositoryRoot ${psQuote(repository)} -OutputRoot ${psQuote(outputRoot)} -PrereleaseReceiptPath ${psQuote(receiptPath)}${releaseId ? ` -ReleaseId ${psQuote(releaseId)}` : ''}`,
    '$result|ConvertTo-Json -Compress',
  ].join('; ')
}

function invokePackage(repository: string, outputRoot: string, receiptPath: string, releaseId?: string) {
  return spawnSync('powershell', ['-NoProfile', '-Command', packageCommand(repository, outputRoot, receiptPath, releaseId)], {encoding: 'utf8'})
}

function invokePackageAsync(repository: string, outputRoot: string, receiptPath: string, releaseId?: string) {
  return spawn('powershell', ['-NoProfile', '-Command', packageCommand(repository, outputRoot, receiptPath, releaseId)], {stdio: ['ignore', 'pipe', 'pipe']})
}

function completed(child: ReturnType<typeof invokePackageAsync>): Promise<{status: number | null; stdout: string; stderr: string}> {
  return new Promise((resolve_, reject) => {
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.once('error', reject)
    child.once('close', status => resolve_({status, stdout, stderr}))
  })
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, {recursive: true, force: true})
})

describe.runIf(process.platform === 'win32')('deterministic local production package', () => {
  it('preserves frozen LF blobs when the real Windows producer has core.autocrlf=true', () => {
    const {repository, receiptPath} = createRepository()
    git(repository, ['config', 'core.autocrlf', 'true'])
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status, result.stderr).toBe(0)
    const value = JSON.parse(result.stdout)
    const probe = spawnSync('python', [resolve('tests/production/prepare_package_probe.py'), value.archivePath, value.manifestPath, value.proofPath], {encoding: 'utf8'})
    expect(probe.status, probe.stderr).toBe(0)
    expect(git(repository, ['config', 'core.autocrlf'])).toBe('true')
  }, 30000)

  it('binds prerelease proof to the real package and interoperates with Python prepare', () => {
    const {repository, receiptPath, commit} = createRepository()
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status, result.stderr).toBe(0)
    const packaged = JSON.parse(result.stdout) as PackageResult
    expect(packaged.proofPath).toBeTruthy()
    const proof = JSON.parse(readFileSync(packaged.proofPath, 'utf8'))
    expect(packaged.proofSha256).toBe(sha256(readFileSync(packaged.proofPath)))
    expect(proof).toMatchObject({
      schemaVersion: 'tio2-production-proof-v1', contractVersion: 'tio2-production-contracts-v1', commit,
      archiveSha256: packaged.archiveSha256, manifestSha256: packaged.manifestSha256,
      source: {branch: 'main', clean: true},
      prerelease: {state: 'PASSED', commit, productionGateReceiptSha256: sha256(readFileSync(receiptPath))},
    })
    const probe = spawnSync('python', [resolve('tests/production/prepare_package_probe.py'), packaged.archivePath, packaged.manifestPath, packaged.proofPath], {encoding: 'utf8', timeout: 30000})
    expect(probe.status, probe.stderr).toBe(0)
    const prepared = JSON.parse(probe.stdout)
    expect(prepared.result).toMatchObject({state: 'PREPARED', candidate: {commit}, active: {kind: 'external', commit: null}})
    expect(prepared.readOnlyCommands).toHaveLength(3)
  }, 30000)

  it('rejects a feature branch without disclosing ignored secret content', () => {
    const {repository, receiptPath} = createRepository()
    git(repository, ['checkout', '-b', 'feature/package'])
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Production packaging requires a clean main worktree')
    expect(result.stderr).not.toContain('database-secret')
  }, 15_000)

  it.each([
    ['dirty tracked files', (repository: string) => writeFileSync(join(repository, 'app', 'application.txt'), 'changed checkout bytes\n')],
    ['untracked files', (repository: string) => writeFileSync(join(repository, 'untracked.txt'), 'untracked\n')],
  ])('rejects %s', (_name, mutate) => {
    const {repository, receiptPath} = createRepository()
    mutate(repository)
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Production packaging requires a clean main worktree')
  }, 15_000)

  it.each([
    ['wrong site', {siteId: 'tio2-a'}],
    ['missing build', {buildId: ''}],
    ['missing CMS identity', {cmsIdentitySha256: ''}],
    ['wrong registered object count', {counts: {businessPages: 56, registeredObjects: 57, widths: 3, browserCases: 174}}],
    ['wrong browser case count', {counts: {businessPages: 56, registeredObjects: 58, widths: 3, browserCases: 173}}],
    ['unreceived workflow', {forms: {rfq: 'RECEIVED', sample: 'PENDING', documents: 'RECEIVED'}}],
  ])('rejects a prerelease receipt with %s', (_name, override) => {
    const {repository, receiptPath, commit} = createRepository()
    writeFileSync(receiptPath, JSON.stringify(receiptFor(commit, override)))
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).not.toContain('database-secret')
  }, 15_000)

  it.each([
    ['wrong schema', {schemaVersion: 1}],
    ['FAILED state', {state: 'FAILED'}],
    ['missing sealing time', {sealedAt: null}],
    ['invalid sealing timestamp', {sealedAt: 'not-a-date'}],
  ])('rejects an incomplete production Gate A receipt with %s', (_name, override) => {
    const {repository, receiptPath, commit} = createRepository()
    writeFileSync(receiptPath, JSON.stringify(receiptFor(commit, override)))
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Exact production prerelease gate is not satisfied')
  }, 15_000)

  it('rejects the former healthy-run receipt because it is not a sealed production gate', () => {
    const {repository, receiptPath, commit} = createRepository()
    writeFileSync(receiptPath, JSON.stringify({schemaVersion: 1, state: 'HEALTHY', failedStage: null, completedAt: '2026-09-10T00:00:00Z', commit, siteId: 'tio2-my', buildId: 'build-1', cmsIdentitySha256: 'a'.repeat(64)}))
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Exact production prerelease gate is not satisfied')
  }, 15_000)

  it('requires a receipt below the explicit prerelease runs directory', () => {
    const {repository, commit} = createRepository()
    const outsideReceipt = join(repository, 'production-receipt.json')
    writeFileSync(outsideReceipt, JSON.stringify(receiptFor(commit)))
    git(repository, ['add', 'production-receipt.json'])
    git(repository, ['commit', '-m', 'outside receipt fixture'])
    const result = invokePackage(repository, join(repository, '.production'), outsideReceipt)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Prerelease receipt path must be below .prerelease/runs')
  }, 15_000)

  it('requires an existing prerelease receipt', () => {
    const {repository, receiptPath} = createRepository()
    rmSync(receiptPath)
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Prerelease receipt does not exist')
  }, 15_000)

  it('keeps generated runs below the ignored repository production directory', () => {
    const {repository, receiptPath} = createRepository()
    const result = invokePackage(repository, join(repository, 'production-output'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Production package output must be the repository .production directory')
  }, 15_000)

  it('archives exact Git bytes, excludes ignored secrets, and records canonical ordered hashes', () => {
    const {repository, receiptPath, commit} = createRepository({trackedReceiverEvidence: true})
    const outputRoot = join(repository, '.production')
    const result = invokePackage(repository, outputRoot, receiptPath)
    expect(result.status, result.stderr).toBe(0)
    const packaged = JSON.parse(result.stdout) as PackageResult
    expect(packaged).toMatchObject({commit, releaseId: expect.stringMatching(new RegExp(`-${commit.slice(0, 12)}$`))})
    expect(packaged.archiveSha256).toBe(sha256(readFileSync(packaged.archivePath)))
    expect(packaged.manifestSha256).toBe(sha256(readFileSync(packaged.manifestPath)))
    const members = execFileSync('tar', ['-tzf', packaged.archivePath], {encoding: 'utf8'})
    expect(members).toContain('app/application.txt')
    expect(members).not.toContain('docs/verification/receiver-payload.json')
    expect(members).not.toMatch(/(?:^|\/)(?:\.env|ignored\.txt|\.prerelease|\.production|docs\/verification)(?:\n|\/|$)/u)
    const archiveText = readFileSync(packaged.archivePath).toString('utf8')
    expect(archiveText).not.toContain('database-secret')
    expect(archiveText).not.toContain('receiver-private-payload')
    const manifest = JSON.parse(readFileSync(packaged.manifestPath, 'utf8')) as {commit: string; archiveSha256: string; files: Array<{path: string; sha256: string}>}
    expect(manifest.commit).toBe(commit)
    expect(manifest.archiveSha256).toBe(packaged.archiveSha256)
    expect(manifest.files.map(file => file.path)).toEqual([...manifest.files.map(file => file.path)].sort())
    const application = manifest.files.find(file => file.path === 'app/application.txt')
    expect(application?.sha256).toBe(sha256('committed application bytes\n'))
  }, 15_000)

  it('keeps package hashes bound to archive bytes after the checkout changes', () => {
    const {repository, receiptPath} = createRepository()
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status, result.stderr).toBe(0)
    const packaged = JSON.parse(result.stdout) as PackageResult
    const before = readFileSync(packaged.archivePath)
    writeFileSync(join(repository, 'app', 'application.txt'), 'mutation after hashing\n')
    expect(readFileSync(packaged.archivePath)).toEqual(before)
    expect(sha256(readFileSync(packaged.archivePath))).toBe(packaged.archiveSha256)
    expect(JSON.parse(readFileSync(packaged.manifestPath, 'utf8')).files.find((file: {path: string}) => file.path === 'app/application.txt').sha256)
      .toBe(sha256('committed application bytes\n'))
  }, 15_000)

  it.each([
    ['empty release surface', (repository: string) => {
      const path = join(repository, 'ops', 'production', 'release-surface.json')
      writeFileSync(path, JSON.stringify({...JSON.parse(readFileSync(path, 'utf8')), objects: []}))
    }],
    ['wrong release URL', (repository: string) => {
      const path = join(repository, 'ops', 'production', 'release-surface.json')
      writeFileSync(path, JSON.stringify({...JSON.parse(readFileSync(path, 'utf8')), website: 'https://wrong.example'}))
    }],
    ['weakened package schema', (repository: string) => {
      const path = join(repository, 'ops', 'production', 'release-package.schema.json')
      writeFileSync(path, JSON.stringify({...JSON.parse(readFileSync(path, 'utf8')), additionalProperties: true}))
    }],
    ['empty migration list', (repository: string) => {
      const path = join(repository, 'ops', 'production', 'migration-manifest.json')
      writeFileSync(path, JSON.stringify({...JSON.parse(readFileSync(path, 'utf8')), seeds: []}))
    }],
  ])('rejects a mutated frozen Task 1 contract: %s', (_name, mutateContracts) => {
    const {repository, receiptPath} = createRepository({mutateContracts})
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('frozen Task 1 production contract')
  }, 15_000)

  it('rejects a lexically safe archive symlink before extraction', () => {
    const {repository, receiptPath} = createRepository({unsafeSymlink: true})
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Git archive contains a non-regular member')
  }, 15_000)

  it('keeps the source archive exclusively locked throughout validation and gzip creation', async () => {
    const {repository, receiptPath} = createRepository({largeRuntimeBytes: 32 * 1024 * 1024})
    const child = invokePackageAsync(repository, join(repository, '.production'), receiptPath)
    const done = completed(child)
    let mutationWasAllowed = false
    for (let attempt = 0; attempt < 300 && child.exitCode === null; attempt++) {
      const runs = join(repository, '.production', 'runs')
      if (existsSync(runs)) {
        const run = readdirSync(runs)[0]
        const archive = run ? join(runs, run, 'source.tar') : ''
        const gzip = run ? join(runs, run, 'release.tar.gz') : ''
        if (gzip && existsSync(gzip)) break
        if (archive && existsSync(archive)) {
          const mutation = spawnSync('powershell', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; $stream=[System.IO.File]::Open(${psQuote(archive)}, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None); $stream.Dispose()`], {encoding: 'utf8'})
          mutationWasAllowed ||= mutation.status === 0 && !existsSync(gzip)
          if (mutationWasAllowed) break
        }
      }
      await new Promise(resolve_ => setTimeout(resolve_, 10))
    }
    const result = await done
    expect(mutationWasAllowed).toBe(false)
    expect(result.status, result.stderr).toBe(0)
  }, 90_000)

  it('atomically reserves a release directory for concurrent package attempts', async () => {
    const {repository, receiptPath} = createRepository({largeRuntimeBytes: 8 * 1024 * 1024})
    const output = join(repository, '.production')
    const first = invokePackageAsync(repository, output, receiptPath, 'fixed-release-id')
    const firstDone = completed(first)
    for (let attempt = 0; attempt < 100 && !existsSync(join(output, 'runs', 'fixed-release-id')); attempt++) {
      await new Promise(resolve_ => setTimeout(resolve_, 10))
    }
    const second = invokePackage(repository, output, receiptPath, 'fixed-release-id')
    const firstResult = await firstDone
    expect([firstResult.status, second.status].filter(status => status === 0)).toHaveLength(1)
    expect(`${firstResult.stderr}${second.stderr}`).toContain('Production release run already exists or is reserved')
  }, 90_000)

  it('rejects archive member path traversal before extraction', () => {
    const {repository, receiptPath} = createRepository()
    const traversal = join(repository, '.prerelease', 'runs', 'candidate-1', '..', 'candidate-1', 'production-receipt.json')
    expect(existsSync(traversal)).toBe(true)
    const command = [
      "$ErrorActionPreference='Stop'",
      `Import-Module ${psQuote(modulePath)} -Force`,
      "Assert-ProductionArchiveMemberPath -Path '../outside.txt'|Out-Null",
    ].join('; ')
    const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'})
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Unsafe archive member path')
    expect(result.stderr).not.toContain('database-secret')
    expect(receiptPath).toBeTruthy()
  }, 15_000)
})
