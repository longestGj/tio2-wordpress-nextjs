import {execFileSync, spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, relative, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const modulePath = resolve('scripts/production/Production.Core.psm1')
const contractRoot = resolve('ops/production')
const serverRoot = resolve('ops/production/server')
const temporaryDirectories: string[] = []

type ReceiptOverrides = {
  paths?: string[]
  subjects?: string[]
  affectedConsumers?: string[]
  contentScopes?: string[]
  cmsContractChanged?: boolean
  hostPaths?: string[]
}

type FixtureOptions = ReceiptOverrides & {
  changedPath?: string
  changedBytes?: string
  registeredSites?: string[]
  unsafeSymlink?: boolean
  contentManifestScope?: string
  deletedPath?: string
}

type Fixture = {
  repository: string
  receiptPath: string
  developmentReceiptPath: string
  contentManifestPath?: string
  candidateCommit: string
  changedPath: string
}

type PackageResult = {
  releaseId: string
  subject: string
  releaseType: string
  commit: string
  manifestPath: string
  manifestSha256: string
  proofPath: string
  proofSha256: string
  checksumsPath: string
  checksumsSha256: string
  payloadPath: string
  payloadSha256: string
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

function prereleaseReceipt(commit: string) {
  return {
    schemaVersion: 'tio2-prerelease-production-gate-v1',
    state: 'PASSED',
    commit,
    siteId: 'tio2-my',
    runId: 'candidate-1',
    buildId: 'build-candidate-1',
    previousProductionReceipt: 'PROD-16',
    cmsIdentitySha256: 'a'.repeat(64),
    releaseSurfaceSha256: '6655c74b695b0f0f4d0f9ac94607ba138bf1d42b063e2d5daa101d2953c19cad',
    sealedAt: '2026-09-12T00:00:00.000Z',
    counts: {businessPages: 57, registeredObjects: 59, widths: 3, browserCases: 177},
    forms: {rfq: 'RECEIVED', sample: 'RECEIVED', documents: 'RECEIVED'},
    evidenceSha256: {test: 'b'.repeat(64), liveForms: 'c'.repeat(64), inbox: 'd'.repeat(64)},
  }
}

function createRepository(options: FixtureOptions = {}): Fixture {
  const repository = temporaryDirectory('d16-typed-candidate-')
  const changedPath = options.changedPath ?? 'app/application.txt'
  const registeredSites = options.registeredSites ?? ['tio2-my']
  git(repository, ['init', '-b', 'main'])
  git(repository, ['config', 'user.name', 'Package Test'])
  git(repository, ['config', 'user.email', 'package-test@example.test'])
  git(repository, ['config', 'core.autocrlf', 'false'])
  git(repository, ['config', 'core.symlinks', 'false'])
  cpSync(contractRoot, join(repository, 'ops', 'production'), {recursive: true})
  writeFileSync(join(repository, '.gitignore'), '.prerelease/\n.production/\n.env\n')
  mkdirSync(join(repository, 'docs'), {recursive: true})
  writeFileSync(
    join(repository, 'docs', 'site-registry.md'),
    ['| 网站ID | 网站 |', '|---|---|', ...registeredSites.map(site => `| \`${site}\` | ${site} |`), ''].join('\n'),
  )
  mkdirSync(join(repository, 'app'), {recursive: true})
  writeFileSync(join(repository, 'app', 'application.txt'), 'base application bytes\n')
  if (options.deletedPath) {
    const deletedTarget = join(repository, ...options.deletedPath.split('/'))
    mkdirSync(dirname(deletedTarget), {recursive: true})
    writeFileSync(deletedTarget, 'removed in candidate\n')
  }
  git(repository, ['add', '.gitignore', 'app', 'docs/site-registry.md', 'ops/production'])
  git(repository, ['commit', '-m', 'production base'])

  git(repository, ['checkout', '-b', 'candidate/release-17'])
  const changedTarget = join(repository, ...changedPath.split('/'))
  mkdirSync(dirname(changedTarget), {recursive: true})
  writeFileSync(changedTarget, options.changedBytes ?? 'candidate application bytes\n')
  git(repository, ['add', changedPath])
  if (options.deletedPath) {
    rmSync(join(repository, ...options.deletedPath.split('/')))
    git(repository, ['add', '-u', options.deletedPath])
  }
  if (options.unsafeSymlink) {
    const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], {cwd: repository, input: '../outside-private.txt\n', encoding: 'utf8'}).trim()
    git(repository, ['update-index', '--add', '--cacheinfo', `120000,${blob},app/escape-link`])
  }
  git(repository, ['commit', '-m', 'candidate implementation'])
  const implementationCommit = git(repository, ['rev-parse', 'HEAD'])

  const developmentReceiptPath = join(repository, 'docs', 'verification', 'development-receipts', 'DEV-17.json')
  mkdirSync(dirname(developmentReceiptPath), {recursive: true})
  const developmentReceipt = {
    schemaVersion: 'd16-development-receipt-v1',
    receiptId: 'DEV-17',
    state: 'MERGED_TO_DEVELOP',
    mergeCommit: implementationCommit,
    paths: options.paths ?? [changedPath, ...(options.deletedPath ? [options.deletedPath] : []), ...(options.unsafeSymlink ? ['app/escape-link'] : [])],
    subjects: options.subjects ?? ['tio2-my'],
    affectedConsumers: options.affectedConsumers ?? ['tio2-my'],
    contentScopes: options.contentScopes ?? [],
    cmsContractChanged: options.cmsContractChanged ?? false,
    hostPaths: options.hostPaths ?? [],
  }
  writeFileSync(developmentReceiptPath, JSON.stringify(developmentReceipt))
  git(repository, ['add', relative(repository, developmentReceiptPath)])
  git(repository, ['commit', '-m', 'record development receipt'])
  if (options.unsafeSymlink) git(repository, ['checkout', '--', 'app/escape-link'])

  const candidateCommit = git(repository, ['rev-parse', 'HEAD'])
  const receiptPath = join(repository, '.prerelease', 'runs', 'candidate-1', 'production-receipt.json')
  mkdirSync(dirname(receiptPath), {recursive: true})
  writeFileSync(receiptPath, JSON.stringify(prereleaseReceipt(candidateCommit)))
  const contentManifestPath = options.contentManifestScope
    ? join(repository, '.prerelease', 'runs', 'candidate-1', 'content-manifest.json')
    : undefined
  if (contentManifestPath) {
    writeFileSync(contentManifestPath, JSON.stringify({schemaVersion: 'd16-content-manifest-v1', siteScope: options.contentManifestScope}))
  }
  writeFileSync(join(repository, '.env'), 'DATABASE_PASSWORD=database-secret\n')
  return {repository, receiptPath, developmentReceiptPath, contentManifestPath, candidateCommit, changedPath}
}

function packageCommand(fixture: Fixture, outputRoot = join(fixture.repository, '.production'), extra = ''): string {
  return [
    "$ErrorActionPreference='Stop'",
    `Import-Module ${psQuote(modulePath)} -Force`,
    `$result=New-ProductionPackage -RepositoryRoot ${psQuote(fixture.repository)} -OutputRoot ${psQuote(outputRoot)} -PrereleaseReceiptPath ${psQuote(fixture.receiptPath)} -DevelopmentReceiptPath ${psQuote(fixture.developmentReceiptPath)}${fixture.contentManifestPath ? ` -ContentManifestPath ${psQuote(fixture.contentManifestPath)}` : ''} ${extra}`,
    '$result|ConvertTo-Json -Compress',
  ].join('; ')
}

function invokePackage(fixture: Fixture, outputRoot?: string, extra = '') {
  return spawnSync('powershell', ['-NoProfile', '-Command', packageCommand(fixture, outputRoot, extra)], {encoding: 'utf8'})
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, {recursive: true, force: true})
})

describe.runIf(process.platform === 'win32')('typed local production candidate package', () => {
  it('uses the frozen main..candidate diff and writes the complete immutable envelope', () => {
    const fixture = createRepository()
    const result = invokePackage(fixture)
    expect(result.status, result.stderr).toBe(0)
    const packaged = JSON.parse(result.stdout) as PackageResult
    expect(packaged).toMatchObject({subject: 'tio2-my', releaseType: 'frontend-only', commit: fixture.candidateCommit})
    expect(readdirSync(dirname(packaged.manifestPath)).sort()).toEqual(
      ['candidate-manifest.json', 'checksums.json', 'payload', 'prerelease-proof.json'].sort(),
    )

    const manifestBytes = readFileSync(packaged.manifestPath)
    const proofBytes = readFileSync(packaged.proofPath)
    const manifest = JSON.parse(manifestBytes.toString('utf8'))
    expect(manifest).toMatchObject({
      schemaVersion: 'd16-release-candidate-v1', releaseId: packaged.releaseId,
      subject: 'tio2-my', releaseType: 'frontend-only', sourceCommit: fixture.candidateCommit,
      buildId: 'build-candidate-1', previousProductionReceipt: 'PROD-16',
      cmsContractSha256: 'a'.repeat(64), prereleaseReceiptSha256: sha256(readFileSync(fixture.receiptPath)),
    })
    expect(manifest.files.map((file: {path: string}) => file.path)).toEqual(['frontend/app/application.txt'])
    expect(readFileSync(join(packaged.payloadPath, 'frontend', 'app', 'application.txt'), 'utf8')).toBe('candidate application bytes\n')
    expect(packaged.manifestSha256).toBe(sha256(manifestBytes))
    expect(packaged.proofSha256).toBe(sha256(proofBytes))
    expect(packaged.payloadSha256).toBe(manifest.payloadSha256)

    const checksums = JSON.parse(readFileSync(packaged.checksumsPath, 'utf8'))
    expect(checksums).toEqual({
      schemaVersion: 'd16-release-checksums-v1',
      files: [
        {path: 'candidate-manifest.json', sha256: sha256(manifestBytes)},
        {path: 'payload/frontend/app/application.txt', sha256: sha256('candidate application bytes\n')},
        {path: 'prerelease-proof.json', sha256: sha256(proofBytes)},
      ],
    })
    const validation = spawnSync('python', [
      '-c',
      'import sys; from pathlib import Path; sys.path.insert(0, sys.argv[1]); from candidate_contract import CandidateEnvelope, validate_payload; envelope=CandidateEnvelope.from_path(Path(sys.argv[2])); value=validate_payload(envelope, Path(sys.argv[3])); print(value.release_type)',
      serverRoot,
      packaged.manifestPath,
      packaged.payloadPath,
    ], {encoding: 'utf8'})
    expect(validation.status, validation.stderr).toBe(0)
    expect(validation.stdout.trim()).toBe('frontend-only')
  }, 30_000)

  it('does not expose a command-line release type override', () => {
    const fixture = createRepository()
    const result = invokePackage(fixture, undefined, '-ReleaseType host-infrastructure')
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('ReleaseType')
  }, 15_000)

  it('fails closed when development receipts do not cover the actual diff', () => {
    const fixture = createRepository({paths: []})
    const result = invokePackage(fixture)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Development receipts do not cover main..candidate changes')
    expect(existsSync(join(fixture.repository, '.production', 'runs'))).toBe(false)
  }, 15_000)

  it('does not silently omit an unknown changed path from the candidate package', () => {
    const fixture = createRepository({changedPath: 'unknown/file.xyz'})
    const result = invokePackage(fixture)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('unclassified release change')
    expect(existsSync(join(fixture.repository, '.production', 'runs'))).toBe(false)
  }, 15_000)

  it('includes deleted files in the exact main..candidate change set', () => {
    const fixture = createRepository({deletedPath: 'app/removed.txt'})
    const result = invokePackage(fixture)
    expect(result.status, result.stderr).toBe(0)
    const packaged = JSON.parse(result.stdout) as PackageResult
    expect(existsSync(join(packaged.payloadPath, 'frontend', 'app', 'removed.txt'))).toBe(false)
  }, 15_000)

  it('fails closed when a shared runtime consumer is absent from the site registry', () => {
    const fixture = createRepository({subjects: ['site-b'], affectedConsumers: ['site-b']})
    const result = invokePackage(fixture)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Development receipt consumer is not registered')
  }, 15_000)

  it('fails closed when a shared runtime receipt omits affected consumers', () => {
    const fixture = createRepository({subjects: ['tio2-my'], affectedConsumers: []})
    const result = invokePackage(fixture)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Development receipt does not identify registered shared runtime consumers')
  }, 15_000)

  it('returns campaign-required before writing a package for multiple subjects', () => {
    const fixture = createRepository({
      registeredSites: ['site-b', 'tio2-my'],
      subjects: ['site-b', 'tio2-my'],
      affectedConsumers: ['site-b', 'tio2-my'],
    })
    const result = invokePackage(fixture)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('campaign-required')
    expect(existsSync(join(fixture.repository, '.production', 'runs'))).toBe(false)
  }, 15_000)

  it('stops when the classified release adapter is not installed in phase one', () => {
    const fixture = createRepository({
      changedPath: 'content/tio2-my/records.json',
      changedBytes: '[]\n',
      subjects: [],
      affectedConsumers: ['tio2-my'],
      contentScopes: [],
      contentManifestScope: 'tio2-my',
    })
    const result = invokePackage(fixture)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Release adapter is not installed: content-only')
    expect(existsSync(join(fixture.repository, '.production', 'runs'))).toBe(false)
  }, 15_000)

  it('rejects a content manifest outside the prerelease evidence directory', () => {
    const fixture = createRepository({changedPath: 'content/tio2-my/records.json', changedBytes: '[]\n'})
    const outside = join(fixture.repository, '.prerelease', 'outside-content-manifest.json')
    writeFileSync(outside, JSON.stringify({schemaVersion: 'd16-content-manifest-v1', siteScope: 'tio2-my'}))
    fixture.contentManifestPath = outside
    const result = invokePackage(fixture)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Content manifest path must be below .prerelease/runs')
  }, 15_000)

  it('rejects a dirty candidate and an output outside the repository .production directory', () => {
    const dirty = createRepository()
    writeFileSync(join(dirty.repository, 'app', 'application.txt'), 'dirty\n')
    const dirtyResult = invokePackage(dirty)
    expect(dirtyResult.status).not.toBe(0)
    expect(dirtyResult.stderr).toContain('Production packaging requires a clean candidate worktree')

    const outside = createRepository()
    const outsideResult = invokePackage(outside, join(outside.repository, 'production-output'))
    expect(outsideResult.status).not.toBe(0)
    expect(outsideResult.stderr).toContain('Production package output must be the repository .production directory')
  }, 20_000)

  it('rejects a non-regular Git payload member', () => {
    const fixture = createRepository({unsafeSymlink: true})
    const result = invokePackage(fixture)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Git archive contains a non-regular member')
  }, 15_000)

  it('keeps payload bytes immutable after checkout changes and excludes receipts and secrets', () => {
    const fixture = createRepository()
    const result = invokePackage(fixture)
    expect(result.status, result.stderr).toBe(0)
    const packaged = JSON.parse(result.stdout) as PackageResult
    const payloadFile = join(packaged.payloadPath, 'frontend', 'app', 'application.txt')
    const before = readFileSync(payloadFile)
    writeFileSync(join(fixture.repository, fixture.changedPath), 'later mutation\n')
    expect(readFileSync(payloadFile)).toEqual(before)
    const manifest = JSON.parse(readFileSync(packaged.manifestPath, 'utf8'))
    expect(manifest.files.some((file: {path: string}) => file.path.includes('development-receipts'))).toBe(false)
    expect(JSON.stringify(manifest)).not.toContain('database-secret')
  }, 15_000)
})
