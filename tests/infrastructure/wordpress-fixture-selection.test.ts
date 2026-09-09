import {spawnSync} from 'node:child_process'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {expect, it} from 'vitest'

function probe(overrides: Record<string, string>, enabled = true) {
  mkdirSync(resolve('.tmp'), {recursive: true})
  const root = mkdtempSync(resolve('.tmp/wordpress-fixture-selection-'))
  const marker = join(root, 'calls.jsonl')
  const fixture = resolve('tests/integration/wordpress/site-a-editorial-fixture-runtime.test.ts').replaceAll('\\', '/')
  writeFileSync(join(root, 'probe.test.ts'), `import {vi} from 'vitest';
vi.mock('node:child_process', () => ({spawnSync: (...args) => {require('node:fs').appendFileSync(${JSON.stringify(marker)}, JSON.stringify(args) + '\\n'); throw new Error('SIDE_EFFECT_BLOCKED');}}));
import ${JSON.stringify(fixture)};
`)
  writeFileSync(join(root, 'vitest.config.mjs'), `export default {test:{include:[${JSON.stringify(join(root, 'probe.test.ts').replaceAll('\\', '/'))}],maxWorkers:1}}`)
  const environment = {...process.env}
  for (const key of ['TIO2_TEST_WORDPRESS_ENV', 'TIO2_TEST_WORDPRESS_COMPOSE', 'TIO2_TEST_WORDPRESS_PROJECT']) delete environment[key]
  try {
    const result = spawnSync(process.execPath, [resolve('node_modules/vitest/vitest.mjs'), 'run', '--config', join(root, 'vitest.config.mjs')], {
      cwd: resolve('.'), encoding: 'utf8', timeout: 30_000,
      env: {...environment, ...overrides, WORDPRESS_EDITORIAL_FIXTURE_RUNTIME: enabled ? '1' : '0'},
    })
    return {status: result.status, output: result.stdout + result.stderr, calls: existsSync(marker) ? readFileSync(marker, 'utf8').trim().split('\n').map(line => JSON.parse(line) as [string, string[]]) : []}
  } finally {
    rmSync(root, {recursive: true, force: true})
  }
}

it.each(['TIO2_TEST_WORDPRESS_ENV', 'TIO2_TEST_WORDPRESS_COMPOSE', 'TIO2_TEST_WORDPRESS_PROJECT'])('rejects opt-in fixture with %s before executing a process', key => {
  const result = probe({[key]: 'isolated-test-override'})
  expect(result.status).toBe(1)
  expect(result.output).toContain('Editorial fixture wrapper does not support Compose test overrides')
  expect(result.calls).toEqual([])
}, 35_000)

it('preserves the opt-in default target without executing real Docker', () => {
  const result = probe({})
  expect(result.output).toContain('SIDE_EFFECT_BLOCKED')
  expect(result.calls[0]?.[0]).toBe('docker')
  expect(result.calls[0]?.[1].slice(0, 5)).toEqual(['compose', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml'])
}, 35_000)

it('keeps the original disabled opt-in suite inactive with overrides', () => {
  const result = probe({TIO2_TEST_WORDPRESS_PROJECT: 'isolated-test-override'}, false)
  expect(result.status).toBe(0)
  expect(result.output).toContain('2 skipped')
  expect(result.calls).toEqual([])
}, 35_000)
