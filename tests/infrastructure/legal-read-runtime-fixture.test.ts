import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {prepareLegalReadFixture, runLegalCleanupSteps, stopLegalWordPressAfterStartup, unexpectedLegalBrowserDiagnostics} from '../helpers/legal-read-runtime-fixture'
import {startIsolatedWordPress, type OwnedWordPressRuntime} from '../helpers/wordpress-runtime'
import {createWordPressRuntimeSimulation} from '../helpers/wordpress-runtime-simulation'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: true} as const

const temporaryRoots: string[] = []
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, {recursive: true, force: true})
})

describe('legal-only local runtime fixture ownership', () => {
  it('uses a per-run Next directory without touching existing template public, build or generated files', () => {
    const root = mkdtempSync(join(tmpdir(), 'legal-read-fixture-'))
    temporaryRoots.push(root)
    const template = resolve(root, 'template')
    const runDirectory = resolve(root, 'runs', 'one')
    const repository = resolve(root, 'repository')
    mkdirSync(resolve(template, 'app'), {recursive: true})
    mkdirSync(resolve(template, 'public'), {recursive: true})
    mkdirSync(resolve(template, '.next'), {recursive: true})
    mkdirSync(resolve(repository, 'public'), {recursive: true})
    mkdirSync(runDirectory, {recursive: true})
    writeFileSync(resolve(template, 'public', 'existing.txt'), 'user public')
    writeFileSync(resolve(template, '.next', 'BUILD_ID'), 'user build')
    writeFileSync(resolve(template, 'next-env.d.ts'), 'user generated template')
    writeFileSync(resolve(repository, 'public', 'site-logo.svg'), 'repository public asset')
    writeFileSync(resolve(template, 'next.config.mjs'), 'export default {}')
    writeFileSync(resolve(template, 'tsconfig.json'), JSON.stringify({compilerOptions: {paths: {}}, include: []}))
    writeFileSync(resolve(template, 'app', 'page.tsx'), 'export default function Page() { return null }')

    const runFixture = prepareLegalReadFixture(template, runDirectory, repository)
    expect(runFixture).toBe(resolve(runDirectory, 'next'))
    expect(readFileSync(resolve(runFixture, 'app', 'page.tsx'), 'utf8')).toContain('Page')
    rmSync(runDirectory, {recursive: true, force: true})
    expect(readFileSync(resolve(template, 'public', 'existing.txt'), 'utf8')).toBe('user public')
    expect(readFileSync(resolve(template, '.next', 'BUILD_ID'), 'utf8')).toBe('user build')
    expect(readFileSync(resolve(template, 'next-env.d.ts'), 'utf8')).toBe('user generated template')
    expect(readFileSync(resolve(repository, 'public', 'site-logo.svg'), 'utf8')).toBe('repository public asset')
  })

  it('attempts later independent cleanup after the first cleanup action rejects', async () => {
    const calls: string[] = []
    const errors = await runLegalCleanupSteps([
      {name: 'browser', run: async () => {calls.push('browser'); throw new Error('close failed')}},
      {name: 'wordpress', run: async () => {calls.push('wordpress')}},
      {name: 'logs', run: () => {calls.push('logs')}},
    ])
    expect(calls).toEqual(['browser', 'wordpress', 'logs'])
    expect(errors.map(error => error.message)).toEqual(['browser: close failed'])
  })

  it('retains the synthetic environment after owned WordPress partially starts without returning a handle', async () => {
    const root = mkdtempSync(join(tmpdir(), 'legal-read-partial-start-'))
    temporaryRoots.push(root)
    const runDirectory = resolve(root, 'one')
    const environmentPath = resolve(runDirectory, 'wordpress.env')
    mkdirSync(runDirectory)
    writeFileSync(environmentPath, 'WORDPRESS_DB_NAME=synthetic-only')
    const simulation = await createWordPressRuntimeSimulation()
    const {setPort, dispose} = simulation
    setPort('0.0.0.0:1234')
    let attempted = false
    let wordpress: OwnedWordPressRuntime | undefined
    let startupError: unknown
    try {
      attempted = true
      wordpress = await startIsolatedWordPress({...simulation.options, execute: simulation.execute})
    } catch (error) { startupError = error }
    try {
      expect(startupError).toMatchObject({
        projectName: expect.stringMatching(/^d16-test-/u),
        composeArgs: expect.any(Array),
      })
      let wordpressStopped = false
      const errors = await runLegalCleanupSteps([
        {name: 'WordPress stop', run: async () => {
          await stopLegalWordPressAfterStartup(attempted, wordpress)
          wordpressStopped = true
        }},
        {name: 'owned run directory', run: () => {
          if (!wordpressStopped) throw new Error('Startup state uncertain; environment retained')
          rmSync(runDirectory, {recursive: true, force: false})
        }},
      ])
      expect(errors.map(error => error.message)).toEqual([
        'WordPress stop: WordPress startup returned no handle; owned resources may remain',
        'owned run directory: Startup state uncertain; environment retained',
      ])
      expect(existsSync(environmentPath)).toBe(true)
    } finally {
      await dispose()
    }
  })

  it('allows only the named legal-fixture home prefetch 404 and flags unrelated browser errors', () => {
    const baseUrl = 'http://127.0.0.1:32100'
    const known = [
      `response:404:${baseUrl}/?_rsc=abc123`,
      'console:error:Failed to load resource: the server responded with a status of 404 (Not Found)',
    ]
    expect(unexpectedLegalBrowserDiagnostics(known, baseUrl)).toEqual([])
    expect(unexpectedLegalBrowserDiagnostics([
      ...known,
      `response:404:${baseUrl}/_next/static/missing.js`,
      'pageerror:Uncaught application exception',
    ], baseUrl)).toEqual([
      `response:404:${baseUrl}/_next/static/missing.js`,
      'pageerror:Uncaught application exception',
    ])
    expect(unexpectedLegalBrowserDiagnostics([known[1]!], baseUrl)).toEqual([known[1]])
  })
})
