import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const roots: string[] = []
const wrappers = ['seed-local-wordpress.ps1', 'audit-seed.ps1', 'migrate-root-only-wordpress.ps1',
  'restore-root-only-wordpress.ps1', 'apply-local-site-a-editorial-fixture.ps1'] as const
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true}) })

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'wordpress-wrapper-'))
  roots.push(root)
  for (const path of ['scripts', 'wordpress/seed', 'wordpress/plugins/tio2-site-model/config', '.local-evidence']) mkdirSync(join(root, path), {recursive: true})
  for (const name of [...wrappers, 'root-only-evidence-paths.ps1']) copyFileSync(resolve('scripts', name), join(root, 'scripts', name))
  copyFileSync(resolve('wordpress/seed/representative-content.json'), join(root, 'wordpress/seed/representative-content.json'))
  copyFileSync(resolve('wordpress/plugins/tio2-site-model/config/public-routes.json'), join(root, 'wordpress/plugins/tio2-site-model/config/public-routes.json'))
  // Bind this controlled fixture to the existing digest gate. The checked-in historical
  // digest is deliberately not changed; a separate test below exercises rejection.
  const editorial = join(root, 'scripts/apply-local-site-a-editorial-fixture.ps1')
  const digest = createHash('sha256').update(readFileSync(join(root, 'wordpress/seed/representative-content.json'))).digest('hex').toUpperCase()
  writeFileSync(editorial, readFileSync(editorial, 'utf8').replace(/(\$ExpectedManifestSha256 = ')[A-F0-9]+(')/u, `$1${digest}$2`))
  copyFileSync(resolve('wordpress/docker-compose.yml'), join(root, 'wordpress/docker-compose.yml'))
  writeFileSync(join(root, 'wordpress/.env'), '# controlled fixture; Docker is intercepted\n')
  for (const name of ['apply-seed.php', 'export-audit.php', 'export-route-status-snapshot.php', 'retire-public-routes.php',
    'restore-public-routes.php', 'apply-site-a-editorial-fixture.php', 'site-a-editorial-fixture-core.php']) {
    writeFileSync(join(root, 'wordpress/seed', name), '<?php // Docker boundary is intercepted')
  }
  writeFileSync(join(root, '.local-evidence/snapshot.json'), '{}')
  return root
}

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
function invoke(root: string, wrapper: string, args: string[]) {
  const capture = join(root, 'docker-args.json')
  const command = `function global:docker { ConvertTo-Json -InputObject @($args) -Compress | Set-Content -LiteralPath $env:D16_WRAPPER_CAPTURE; $global:LASTEXITCODE = 71; 'controlled docker failure' }; & ${quote(join(root, 'scripts', wrapper))} ${args.map(arg => arg.startsWith('-') ? arg : quote(arg)).join(' ')}`
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    cwd: root, env: {...process.env, D16_WRAPPER_CAPTURE: capture, COMPOSE_PROJECT_NAME: 'must-not-be-used'}, encoding: 'utf8', windowsHide: true, timeout: 30_000,
  })
  return {result, args: existsSync(capture) ? JSON.parse(readFileSync(capture, 'utf8').replace(/^\uFEFF/u, '')) as string[] : null}
}

describe.runIf(process.platform === 'win32')('shared WordPress PowerShell boundaries', () => {
  it.each(wrappers)('%s targets only the singleton and cannot start dependencies', wrapper => {
    const root = fixture()
    const args = wrapper === 'restore-root-only-wordpress.ps1' ? ['-SnapshotPath', join(root, '.local-evidence/snapshot.json')]
      : wrapper === 'apply-local-site-a-editorial-fixture.ps1' ? ['-PlanOnly'] : []
    const captured = invoke(root, wrapper, args)
    expect(captured.args, `${captured.result.stdout}\n${captured.result.stderr}`).not.toBeNull()
    expect(captured.args!.slice(0, 3)).toEqual(['compose', '--project-name', 'wordpress'])
    const run = captured.args!.indexOf('run')
    expect(captured.args!.slice(run, run + 4)).toEqual(['run', '--rm', '--no-deps', '--no-TTY'])
    expect(captured.args).not.toEqual(expect.arrayContaining(['up']))
    expect(captured.result.status).not.toBe(0)
    expect(readdirSync(join(root, 'wordpress/seed')).filter(name => name.startsWith('.runtime-'))).toEqual([])
  })

  it.each([
    ['seed-local-wordpress.ps1', ['-ManifestPath', 'custom.json'], 'ManifestPath is available only with -PlanOnly'],
    ['apply-local-site-a-editorial-fixture.ps1', ['-PlanOnly', '-Apply'], 'Choose exactly one mode'],
    ['restore-root-only-wordpress.ps1', ['-SnapshotPath', 'https://example.test/snapshot.json'], ''],
  ])('preserves %s rejection before Docker', (wrapper, args, message) => {
    const captured = invoke(fixture(), wrapper, args as string[])
    expect(captured.result.status).not.toBe(0)
    expect(captured.args).toBeNull()
    if (message) expect(`${captured.result.stdout}\n${captured.result.stderr}`).toContain(message)
  })

  it('rejects editorial manifest drift before Docker', () => {
    const root = fixture()
    writeFileSync(join(root, 'wordpress/seed/representative-content.json'), '{}')
    const captured = invoke(root, 'apply-local-site-a-editorial-fixture.ps1', ['-PlanOnly'])
    expect(captured.result.status).not.toBe(0)
    expect(captured.args).toBeNull()
    expect(`${captured.result.stdout}\n${captured.result.stderr}`).toContain('manifest hash does not match')
  })
})
