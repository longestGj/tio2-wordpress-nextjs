import {execFileSync, spawn, spawnSync} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const controller = resolve('scripts/start-local-sites.ps1')
const temporaryDirectories: string[] = []

function newStateDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'tio2-local-sites-test-'))
  temporaryDirectories.push(directory)
  return directory
}

function invokeController(arguments_: string[]): string {
  return execFileSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', controller, ...arguments_],
    {encoding: 'utf8'},
  ).trim()
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {recursive: true, force: true})
  }
})

describe.runIf(process.platform === 'win32')('local sites controller', () => {
  it('describes incremental state, cancellation, and handle-based stop safety', () => {
    const contract = JSON.parse(invokeController(['-Plan'])) as unknown

    expect(contract).toEqual({
      mode: 'plan',
      sites: [
        {siteId: 'tio2-a', port: 3001, distDir: '.next-tio2-a'},
        {siteId: 'tio2-b', port: 3002, distDir: '.next-tio2-b'},
      ],
      startup: {
        statePersistence: 'after-each-start',
        cancellation: 'cooperative-file',
      },
      stop: {
        preflightAllRecords: true,
        finalIdentityCheck: 'immediate',
        terminationTarget: 'validated-process-handle',
      },
    })
  })

  it('reports both fixed local sites stopped when no controller state exists', () => {
    const stateDirectory = newStateDirectory()

    const status = JSON.parse(
      invokeController(['-Status', '-StateDirectory', stateDirectory]),
    ) as {
      mode: string
      sites: Array<{siteId: string; port: number; running: boolean}>
    }

    expect(status).toEqual({
      mode: 'status',
      sites: [
        {siteId: 'tio2-a', port: 3001, running: false},
        {siteId: 'tio2-b', port: 3002, running: false},
      ],
    })
  })

  it('refuses to stop a live PID whose recorded identity does not match', async () => {
    const stateDirectory = newStateDirectory()
    const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore',
    })

    try {
      expect(unrelated.pid).toBeTypeOf('number')
      writeFileSync(
        join(stateDirectory, 'sites.json'),
        JSON.stringify({
          schemaVersion: 1,
          repositoryRoot: resolve('.'),
          sessionId: 'test-mismatch',
          sites: [
            {
              siteId: 'tio2-a',
              port: 3001,
              pid: unrelated.pid,
              startTimeUtcTicks: 0,
              executablePath: process.execPath,
              nextCliPath: resolve('node_modules/next/dist/bin/next'),
            },
          ],
        }),
      )

      const result = spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          controller,
          '-Stop',
          '-StateDirectory',
          stateDirectory,
        ],
        {encoding: 'utf8'},
      )

      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('Refused to stop PID')
      expect(unrelated.exitCode).toBeNull()
    } finally {
      unrelated.kill()
    }
  })
})
