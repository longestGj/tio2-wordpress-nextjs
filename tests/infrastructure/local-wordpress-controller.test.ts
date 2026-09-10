import {execFileSync, spawnSync} from 'node:child_process'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const controller = resolve('scripts/local-wordpress.ps1')
const directories: string[] = []
function setup(options: {mismatch?: boolean; empty?: boolean; changedIds?: boolean; race?: boolean} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'd16-cms-'))
  directories.push(root)
  mkdirSync(join(root, 'wordpress'))
  mkdirSync(join(root, '.runtime'))
  writeFileSync(join(root, 'wordpress/.env'), '')
  writeFileSync(join(root, 'wordpress/docker-compose.yml'), 'services: {}')
  execFileSync('git', ['init', '-q'], {cwd: root})
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '--allow-empty', '-qm', 'base'], {cwd: root})
  const logPath = join(root, 'docker-calls.jsonl')
  const fixture = {root, logPath, ...options}
  writeFileSync(join(root, 'fixture.json'), JSON.stringify(fixture))
  writeFileSync(join(root, 'docker.cmd'), `@echo off\r\n"${process.execPath}" "${join(root, 'fake.cjs')}" %*\r\n`)
  writeFileSync(join(root, 'fake.cjs'), `
const fs = require('node:fs'), path = require('node:path');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.json')));
const args = process.argv.slice(2);
const previous = fs.existsSync(fixture.logPath) ? fs.readFileSync(fixture.logPath, 'utf8').trim().split('\\n').map(JSON.parse) : [];
fs.appendFileSync(fixture.logPath, JSON.stringify(args) + '\\n');
if (args[0] === 'ps') {
  if (!fixture.empty || previous.some(call => call.includes('up'))) console.log(fixture.changedIds ? 'replacement-id' : 'wordpress-id');
} else if (args[0] === 'inspect') {
  const mismatch = fixture.mismatch || (fixture.race && previous.filter(call => call[0] === 'inspect').length > 0);
  console.log(JSON.stringify({Id: fixture.changedIds ? 'replacement-id' : 'wordpress-id', Config: {Labels: {
    'com.docker.compose.project': 'wordpress',
    'com.docker.compose.project.working_dir': mismatch ? path.join(fixture.root, 'other') : path.join(fixture.root, 'wordpress'),
    'com.docker.compose.project.config_files': path.join(fixture.root, 'wordpress/docker-compose.yml'),
    'com.docker.compose.service': 'wordpress'
  }}, State: {Running: true}, NetworkSettings: {Ports: {'80/tcp': [{HostIp: '127.0.0.1', HostPort: '8080'}]}}}));
} else if (args[0] !== 'compose') process.exit(9);
`)
  function calls(): string[][] {
    return existsSync(logPath) ? readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []
  }
  function record() {
    writeFileSync(join(root, '.runtime/development-wordpress.json'), JSON.stringify({schemaVersion: 1, repositoryRoot: root, composeFile: join(root, 'wordpress/docker-compose.yml'), project: 'wordpress', containerIds: ['wordpress-id'], commit: 'a'.repeat(40), createdAt: '2026-01-01T00:00:00.000Z'}))
  }
  function invoke(action: string, listening = false) {
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
    return spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `function global:Get-NetTCPConnection { param($State,$LocalPort,$ErrorAction) ${listening ? '[pscustomobject]@{LocalPort=8080}' : ''} }; & ${quote(controller)} -Action ${action} -RepositoryRoot ${quote(root)} -Json`], {encoding: 'utf8', env: {...process.env, PATH: `${root};${process.env.PATH}`}})
  }
  return {root, calls, record, invoke}
}
afterEach(() => directories.splice(0).forEach(directory => rmSync(directory, {recursive: true, force: true})))

describe.runIf(process.platform === 'win32')('canonical development WordPress controller', () => {
  it('plans the canonical persistent CMS without calling Docker', () => {
    const test = setup()
    const result = test.invoke('Plan')
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({project: 'wordpress', endpoint: 'http://127.0.0.1:8080', composeFile: join(test.root, 'wordpress/docker-compose.yml'), volumes: 'persistent'})
    expect(test.calls()).toEqual([])
  })

  it.each([{mismatch: true}, {changedIds: true}, {race: true}])('refuses unsafe Stop with identity evidence %j', options => {
    const test = setup(options)
    test.record()
    const result = test.invoke('Stop')
    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/identity|owner|mismatch/i)
    expect(test.calls().some(call => call[0] === 'compose')).toBe(false)
  })

  it('refuses stopping a project without a controller record', () => {
    const test = setup()
    expect(test.invoke('Stop').status).not.toBe(0)
    expect(test.invoke('Stop').stderr).toContain('ownership record')
    expect(test.calls().some(call => call[0] === 'compose')).toBe(false)
  })

  it('reports canonical ownership even when Plan is invoked from a linked worktree', () => {
    const commonDirectory = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {encoding: 'utf8'}).trim()
    const result = spawnSync('powershell', ['-NoProfile', '-File', controller, '-Action', 'Plan', '-RepositoryRoot', resolve('.'), '-Json'], {encoding: 'utf8'})
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout).repositoryRoot).toBe(resolve(commonDirectory, '..'))
  })

  it('starts the exact project, records its identity, reports it, and stops without removing volumes', () => {
    const test = setup({empty: true})
    const start = test.invoke('Start')
    expect(start.status, start.stderr).toBe(0)
    const record = JSON.parse(readFileSync(join(test.root, '.runtime/development-wordpress.json'), 'utf8'))
    expect(record).toMatchObject({repositoryRoot: test.root, composeFile: join(test.root, 'wordpress/docker-compose.yml'), project: 'wordpress', containerIds: ['wordpress-id']})
    expect(record.commit).toMatch(/^[a-f0-9]{40}$/u)
    expect(Number.isFinite(Date.parse(record.createdAt))).toBe(true)
    const status = test.invoke('Status')
    expect(status.status, status.stderr).toBe(0)
    expect(JSON.parse(status.stdout)).toMatchObject({state: 'expected-owner'})
    const stop = test.invoke('Stop')
    expect(stop.status, stop.stderr).toBe(0)
    const compose = test.calls().filter(call => call[0] === 'compose')
    const prefix = ['compose', '--project-name', 'wordpress', '--env-file', join(test.root, 'wordpress/.env'), '-f', join(test.root, 'wordpress/docker-compose.yml')]
    expect(compose).toEqual([[...prefix, 'up', '-d', 'db', 'wordpress'], [...prefix, 'stop', 'wordpress', 'db']])
    expect(test.calls().some(call => call.includes('down') || call.includes('--volumes'))).toBe(false)
  }, 15000)

  it('refuses an unknown listener before starting the CMS', () => {
    const test = setup({empty: true})
    const result = test.invoke('Start', true)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('8080')
    expect(test.calls().some(call => call[0] === 'compose')).toBe(false)
  })
})
