import {execFileSync, spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
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

function createRepository(): {repository: string; receiptPath: string; commit: string} {
  const repository = temporaryDirectory('d16-production-package-')
  git(repository, ['init', '-b', 'main'])
  git(repository, ['config', 'user.name', 'Package Test'])
  git(repository, ['config', 'user.email', 'package-test@example.test'])
  git(repository, ['config', 'core.autocrlf', 'false'])
  cpSync(contractRoot, join(repository, 'ops', 'production'), {recursive: true})
  const migration = JSON.parse(readFileSync(join(contractRoot, 'migration-manifest.json'), 'utf8')) as {seeds: Array<{path: string}>}
  for (const seed of migration.seeds) {
    const target = join(repository, seed.path)
    mkdirSync(dirname(target), {recursive: true})
    writeFileSync(target, execFileSync('git', ['show', `HEAD:${seed.path}`]))
  }
  writeFileSync(join(repository, '.gitignore'), '.prerelease/\n.production/\n.env\nignored.txt\n')
  writeFileSync(join(repository, 'application.txt'), 'committed application bytes\n')
  writeFileSync(join(repository, '.env'), 'DATABASE_PASSWORD=database-secret\n')
  writeFileSync(join(repository, 'ignored.txt'), 'database-secret\n')
  git(repository, ['add', '.gitignore', 'application.txt', 'ops/production', 'wordpress/seed'])
  git(repository, ['commit', '-m', 'release candidate'])
  const commit = git(repository, ['rev-parse', 'HEAD'])
  const receiptPath = join(repository, '.prerelease', 'runs', 'candidate-1', 'production-receipt.json')
  mkdirSync(join(repository, '.prerelease', 'runs', 'candidate-1'), {recursive: true})
  writeFileSync(receiptPath, JSON.stringify({
    schemaVersion: 1,
    commit,
    siteId: 'tio2-my',
    buildId: 'build-candidate-1',
    cmsIdentitySha256: 'a'.repeat(64),
  }))
  return {repository, receiptPath, commit}
}

function packageCommand(repository: string, outputRoot: string, receiptPath: string): string {
  return [
    "$ErrorActionPreference='Stop'",
    `Import-Module ${psQuote(modulePath)} -Force`,
    `$result=New-ProductionPackage -RepositoryRoot ${psQuote(repository)} -OutputRoot ${psQuote(outputRoot)} -PrereleaseReceiptPath ${psQuote(receiptPath)}`,
    '$result|ConvertTo-Json -Compress',
  ].join('; ')
}

function invokePackage(repository: string, outputRoot: string, receiptPath: string) {
  return spawnSync('powershell', ['-NoProfile', '-Command', packageCommand(repository, outputRoot, receiptPath)], {encoding: 'utf8'})
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, {recursive: true, force: true})
})

describe.runIf(process.platform === 'win32')('deterministic local production package', () => {
  it('rejects a feature branch without disclosing ignored secret content', () => {
    const {repository, receiptPath} = createRepository()
    git(repository, ['checkout', '-b', 'feature/package'])
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Production packaging requires a clean main worktree')
    expect(result.stderr).not.toContain('database-secret')
  })

  it.each([
    ['dirty tracked files', (repository: string) => writeFileSync(join(repository, 'application.txt'), 'changed checkout bytes\n')],
    ['untracked files', (repository: string) => writeFileSync(join(repository, 'untracked.txt'), 'untracked\n')],
  ])('rejects %s', (_name, mutate) => {
    const {repository, receiptPath} = createRepository()
    mutate(repository)
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Production packaging requires a clean main worktree')
  })

  it.each([
    ['wrong site', {siteId: 'tio2-a'}],
    ['missing build', {buildId: ''}],
    ['missing CMS identity', {cmsIdentitySha256: ''}],
  ])('rejects a prerelease receipt with %s', (_name, override) => {
    const {repository, receiptPath, commit} = createRepository()
    writeFileSync(receiptPath, JSON.stringify({schemaVersion: 1, commit, siteId: 'tio2-my', buildId: 'build-candidate-1', cmsIdentitySha256: 'a'.repeat(64), ...override}))
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status).not.toBe(0)
    expect(result.stderr).not.toContain('database-secret')
  }, 15_000)

  it('requires a receipt below the explicit prerelease runs directory', () => {
    const {repository, commit} = createRepository()
    const outsideReceipt = join(repository, 'production-receipt.json')
    writeFileSync(outsideReceipt, JSON.stringify({schemaVersion: 1, commit, siteId: 'tio2-my', buildId: 'build-candidate-1', cmsIdentitySha256: 'a'.repeat(64)}))
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
    const {repository, receiptPath, commit} = createRepository()
    const outputRoot = join(repository, '.production')
    const result = invokePackage(repository, outputRoot, receiptPath)
    expect(result.status, result.stderr).toBe(0)
    const packaged = JSON.parse(result.stdout) as PackageResult
    expect(packaged).toMatchObject({commit, releaseId: expect.stringMatching(new RegExp(`-${commit.slice(0, 12)}$`))})
    expect(packaged.archiveSha256).toBe(sha256(readFileSync(packaged.archivePath)))
    expect(packaged.manifestSha256).toBe(sha256(readFileSync(packaged.manifestPath)))
    const members = execFileSync('tar', ['-tzf', packaged.archivePath], {encoding: 'utf8'})
    expect(members).toContain('application.txt')
    expect(members).not.toMatch(/(?:^|\/)(?:\.env|ignored\.txt|\.prerelease|\.production)(?:\n|\/|$)/u)
    const archiveText = readFileSync(packaged.archivePath).toString('utf8')
    expect(archiveText).not.toContain('database-secret')
    const manifest = JSON.parse(readFileSync(packaged.manifestPath, 'utf8')) as {commit: string; archiveSha256: string; files: Array<{path: string; sha256: string}>}
    expect(manifest.commit).toBe(commit)
    expect(manifest.archiveSha256).toBe(packaged.archiveSha256)
    expect(manifest.files.map(file => file.path)).toEqual([...manifest.files.map(file => file.path)].sort())
    const application = manifest.files.find(file => file.path === 'application.txt')
    expect(application?.sha256).toBe(sha256('committed application bytes\n'))
  }, 15_000)

  it('keeps package hashes bound to archive bytes after the checkout changes', () => {
    const {repository, receiptPath} = createRepository()
    const result = invokePackage(repository, join(repository, '.production'), receiptPath)
    expect(result.status, result.stderr).toBe(0)
    const packaged = JSON.parse(result.stdout) as PackageResult
    const before = readFileSync(packaged.archivePath)
    writeFileSync(join(repository, 'application.txt'), 'mutation after hashing\n')
    expect(readFileSync(packaged.archivePath)).toEqual(before)
    expect(sha256(readFileSync(packaged.archivePath))).toBe(packaged.archiveSha256)
    expect(JSON.parse(readFileSync(packaged.manifestPath, 'utf8')).files.find((file: {path: string}) => file.path === 'application.txt').sha256)
      .toBe(sha256('committed application bytes\n'))
  }, 15_000)

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
