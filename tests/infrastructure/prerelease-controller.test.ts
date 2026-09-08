import {execFileSync, spawnSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const controller = resolve('scripts/prerelease.ps1')
const modulePath = resolve('scripts/prerelease/Prerelease.Core.psm1')
const temporaryDirectories: string[] = []

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

function createRepository(branch = 'main'): string {
  const directory = temporaryDirectory('d16-prerelease-git-')
  execFileSync('git', ['init', '-b', 'main'], {cwd: directory})
  writeFileSync(join(directory, 'tracked.txt'), 'clean\n')
  writeFileSync(join(directory, '.gitignore'), '.prerelease/\n.env.prerelease.local\n')
  execFileSync('git', ['add', 'tracked.txt', '.gitignore'], {cwd: directory})
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-m', 'base'], {cwd: directory})
  if (branch !== 'main') execFileSync('git', ['switch', '-c', branch], {cwd: directory})
  return directory
}

function invokeController(args: string[]) {
  return spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', controller, ...args],
    {encoding: 'utf8'},
  )
}

function writeValidEnvironment(repository: string) {
  writeFileSync(join(repository, '.env.prerelease.local'), [
    'WORDPRESS_DB_NAME=tio2_my_prerelease',
    'WORDPRESS_DB_USER=tio2_my_prerelease',
    'WORDPRESS_DB_PASSWORD=database-secret',
    'WORDPRESS_DB_ROOT_PASSWORD=root-secret',
    'WORDPRESS_ADMIN_USER=editor',
    'WORDPRESS_ADMIN_PASSWORD=admin-secret',
    'WORDPRESS_ADMIN_EMAIL=admin@example.test',
    'NEXTJS_REVALIDATION_SECRET_TIO2_MY=revalidation-secret',
    'NEXTJS_PREVIEW_SECRET_TIO2_MY=preview-secret',
    'NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY=receiver-key',
    'PRERELEASE_LIVE_FORMS_ENABLED=false',
  ].join('\n'))
}

function writeRecordedRun(repository: string) {
  const stateRoot = join(repository, '.prerelease')
  const runRoot = join(stateRoot, 'runs', 'existing-run')
  execFileSync('powershell', ['-NoProfile', '-Command', `New-Item -ItemType Directory -Force -Path '${join(runRoot, 'source').replaceAll("'", "''")}' | Out-Null`])
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repository, encoding: 'utf8'}).trim()
  const manifestPath = join(runRoot, 'run-manifest.json')
  writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1,
    state: 'HEALTHY',
    runId: 'existing-run',
    siteId: 'tio2-my',
    commit,
    buildId: 'existing-build',
    cmsIdentitySha256: 'a'.repeat(64),
    sourcePath: join(runRoot, 'source'),
  }))
  writeFileSync(join(stateRoot, 'current-run.json'), JSON.stringify({runId: 'existing-run', manifestPath}))
  return {stateRoot, manifestPath}
}

function writeFakeDocker(directory: string, running: boolean): {executable: string; logPath: string} {
  const executable = join(directory, 'fake-docker.cmd')
  const logPath = join(directory, 'docker.log')
  writeFileSync(executable, [
    '@echo off',
    `echo %*>>"${logPath}"`,
    'echo %* | %SystemRoot%\\System32\\findstr.exe /C:"ps --status running --quiet" >nul',
    'if not errorlevel 1 (',
    ...(running ? ['  echo prerelease-container'] : []),
    '  exit /b 0',
    ')',
    'echo %* | %SystemRoot%\\System32\\findstr.exe /C:"config --volumes" >nul',
    'if not errorlevel 1 (',
    '  echo prerelease_db',
    '  echo prerelease_wp',
    '  echo prerelease_npm_cache',
    '  exit /b 0',
    ')',
    'exit /b 0',
  ].join('\r\n'))
  return {executable, logPath}
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {recursive: true, force: true})
  }
})

describe.runIf(process.platform === 'win32')('local prerelease controller', () => {
  it('publishes the exact operator contract as JSON', () => {
    const result = invokeController(['-Plan'])
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      schemaVersion: 1,
      composeProject: 'd16-tio2-my-prerelease',
      siteId: 'tio2-my',
      website: 'http://127.0.0.1:3100',
      wordpress: 'http://127.0.0.1:8180',
      acceptedBranch: 'main',
      actions: ['Start', 'Status', 'Stop', 'ResetData', 'Test', 'TestLiveForms'],
    })
  })

  it('rejects Start outside main before invoking Docker', () => {
    const repository = createRepository('feature')
    const result = invokeController([
      '-Action', 'Start',
      '-RepositoryRoot', repository,
      '-StateRoot', join(repository, '.prerelease'),
      '-DockerExecutable', join(repository, 'missing-docker.exe'),
    ])
    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain('requires branch main; actual branch is feature')
  })

  it('rejects tracked and untracked changes before invoking Docker', () => {
    const repository = createRepository()
    writeFileSync(join(repository, 'tracked.txt'), 'changed\n')
    writeFileSync(join(repository, 'untracked.txt'), 'new\n')
    const result = invokeController([
      '-Action', 'Start',
      '-RepositoryRoot', repository,
      '-StateRoot', join(repository, '.prerelease'),
      '-DockerExecutable', join(repository, 'missing-docker.exe'),
    ])
    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain('requires a clean worktree')
    expect(`${result.stdout}\n${result.stderr}`).toContain('tracked.txt')
    expect(`${result.stdout}\n${result.stderr}`).toContain('untracked.txt')
  })

  it('holds an exclusive operation lock until its handle is disposed', () => {
    const state = temporaryDirectory('d16-prerelease-lock-')
    const command = [
      `Import-Module '${modulePath.replaceAll("'", "''")}' -Force`,
      `$first=Enter-PrereleaseLock -StateRoot '${state.replaceAll("'", "''")}'`,
      `$blocked=$false; try { $second=Enter-PrereleaseLock -StateRoot '${state.replaceAll("'", "''")}' } catch { $blocked=$true }`,
      'Exit-PrereleaseLock -Lock $first',
      '$third=Enter-PrereleaseLock -StateRoot \'' + state.replaceAll("'", "''") + '\'',
      'Exit-PrereleaseLock -Lock $third',
      '[pscustomobject]@{blocked=$blocked;reacquired=$true}|ConvertTo-Json -Compress',
    ].join('; ')
    const output = execFileSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'})
    expect(JSON.parse(output)).toEqual({blocked: true, reacquired: true})
  })

  it('accepts only volumes owned by the prerelease Compose project', () => {
    const command = [
      `Import-Module '${modulePath.replaceAll("'", "''")}' -Force`,
      "$accepted=@(Assert-PrereleaseOwnedVolumes -Volumes @('d16-tio2-my-prerelease_prerelease_db','d16-tio2-my-prerelease_prerelease_wp'))",
      "$blocked=$false;try{Assert-PrereleaseOwnedVolumes -Volumes @('other_db')}catch{$blocked=$true}",
      '[pscustomobject]@{accepted=$accepted;blocked=$blocked}|ConvertTo-Json -Compress',
    ].join('; ')
    const output = execFileSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'})
    expect(JSON.parse(output)).toEqual({
      accepted: ['d16-tio2-my-prerelease_prerelease_db', 'd16-tio2-my-prerelease_prerelease_wp'],
      blocked: true,
    })
  })

  it('uses the native exit code when Docker writes successful progress to stderr', () => {
    const directory = temporaryDirectory('d16-prerelease-stderr-')
    const executable = join(directory, 'docker-progress.cmd')
    writeFileSync(executable, '@echo off\r\n>&2 echo Network prerelease_default Creating\r\nexit /b 0\r\n')
    const command = [
      "$ErrorActionPreference='Stop'",
      `Import-Module '${modulePath.replaceAll("'", "''")}' -Force`,
      `Invoke-PrereleaseDocker -DockerExecutable '${executable.replaceAll("'", "''")}' -Arguments @('compose','up') | Out-Null`,
      "'OK'",
    ].join('; ')
    const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'})
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout.trim()).toBe('OK')
  })

  it('rejects missing or placeholder configuration without echoing values', () => {
    const directory = temporaryDirectory('d16-prerelease-env-')
    const environmentFile = join(directory, '.env.prerelease.local')
    writeFileSync(environmentFile, [
      'WORDPRESS_DB_NAME=tio2_my_prerelease',
      'WORDPRESS_DB_USER=tio2_my_prerelease',
      'WORDPRESS_DB_PASSWORD=replace-with-local-database-password',
      'WORDPRESS_DB_ROOT_PASSWORD=root-secret',
      'WORDPRESS_ADMIN_USER=editor',
      'WORDPRESS_ADMIN_PASSWORD=admin-secret',
      'WORDPRESS_ADMIN_EMAIL=admin@example.test',
      'NEXTJS_REVALIDATION_SECRET_TIO2_MY=revalidation-secret',
      'NEXTJS_PREVIEW_SECRET_TIO2_MY=preview-secret',
      'NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY=receiver-key',
      'PRERELEASE_LIVE_FORMS_ENABLED=false',
    ].join('\n'))
    const command = [
      "$ErrorActionPreference='Stop'",
      `Import-Module '${modulePath.replaceAll("'", "''")}' -Force`,
      `Assert-PrereleaseEnvironmentFile -Path '${environmentFile.replaceAll("'", "''")}'`,
    ].join('; ')
    const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {encoding: 'utf8'})
    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain('WORDPRESS_DB_PASSWORD')
    expect(`${result.stdout}\n${result.stderr}`).not.toContain('root-secret')
    expect(`${result.stdout}\n${result.stderr}`).not.toContain('receiver-key')
  })

  it('resets only CMS data volumes, removes attached containers and starts a fresh run', () => {
    const source = readFileSync(controller, 'utf8')
    const resetBlock = source.slice(source.indexOf("'ResetData' {"), source.indexOf("{ $_ -in @('Test', 'TestLiveForms') }"))
    expect(resetBlock).toContain("@('prerelease_db', 'prerelease_wp')")
    expect(resetBlock).not.toContain('prerelease_npm_cache')
    expect(resetBlock).toMatch(/@\('rm', '--force', '--stop', 'web', 'wordpress', 'db'\)[\s\S]*volume', 'rm'/u)
    expect(resetBlock).toContain("state                = 'RESETTING'")
    expect(resetBlock.indexOf('Write-PrereleaseResult ([pscustomobject]$resetOperation)')).toBeLessThan(resetBlock.indexOf("@('rm', '--force'"))
    expect(resetBlock).toContain('Invoke-PrereleaseStart')
    expect(resetBlock.indexOf('Invoke-PrereleaseStart')).toBeLessThan(resetBlock.lastIndexOf('Exit-PrereleaseLock'))
    expect(resetBlock).toContain('oldCmsIdentitySha256')
    expect(resetBlock).toContain('newCmsIdentitySha256')
  })

  it('stops a newly attempted web service when startup fails', () => {
    const source = readFileSync(controller, 'utf8')
    expect(source).toContain('$webStartAttempted = $true')
    expect(source).toMatch(/catch \{[\s\S]*webStartAttempted[\s\S]*@\('stop', 'web'\)/u)
  })

  it('preserves the recorded run when reset is rejected or a fresh build fails, so Stop and retry remain usable', () => {
    const repository = createRepository()
    writeValidEnvironment(repository)
    const {stateRoot, manifestPath} = writeRecordedRun(repository)
    const fakeRoot = temporaryDirectory('d16-prerelease-docker-')
    const runningDocker = writeFakeDocker(fakeRoot, true)
    const common = ['-RepositoryRoot', repository, '-StateRoot', stateRoot]

    const rejected = invokeController(['-Action', 'ResetData', ...common, '-DockerExecutable', runningDocker.executable])
    expect(rejected.status).not.toBe(0)
    expect(`${rejected.stdout}\n${rejected.stderr}`).toContain('requires the prerelease stack to be stopped')
    expect(JSON.parse(readFileSync(join(stateRoot, 'current-run.json'), 'utf8'))).toMatchObject({manifestPath})
    expect(invokeController(['-Action', 'Stop', ...common, '-DockerExecutable', runningDocker.executable]).status).toBe(0)

    const stoppedDocker = writeFakeDocker(fakeRoot, false)
    const buildFailure = invokeController(['-Action', 'ResetData', ...common, '-DockerExecutable', stoppedDocker.executable])
    expect(buildFailure.status).not.toBe(0)
    expect(`${buildFailure.stdout}\n${buildFailure.stderr}`).toContain('BUILD_ID')
    expect(JSON.parse(readFileSync(join(stateRoot, 'current-run.json'), 'utf8'))).toMatchObject({manifestPath})
    expect(invokeController(['-Action', 'Stop', ...common, '-DockerExecutable', stoppedDocker.executable]).status).toBe(0)
    const retry = invokeController(['-Action', 'ResetData', ...common, '-DockerExecutable', stoppedDocker.executable])
    expect(retry.status).not.toBe(0)
    expect(`${retry.stdout}\n${retry.stderr}`).not.toContain('Cannot bind argument')
  }, 30_000)
})
