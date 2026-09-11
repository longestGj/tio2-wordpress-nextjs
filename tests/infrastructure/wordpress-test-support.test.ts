import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {createRequire} from 'node:module'
import {dirname, join, resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {afterEach, expect, it} from 'vitest'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

const directories: string[] = []
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, {recursive: true, force: true}) })
async function support() {
  expect(existsSync('tests/helpers/wordpress-test-support.ts'), 'WordPress test isolation support is missing').toBe(true)
  return import('../helpers/wordpress-test-support')
}
function directory() {
  const path = mkdtempSync(join(tmpdir(), 'wordpress-lock-test-'))
  directories.push(path)
  return path
}

it('runs controlled PHP without a CMS, host ports, network or writable workspace', async () => {
  const {isolatedPhpArgs} = await support()
  expect(isolatedPhpArgs(resolve('.'))).toEqual(['run', '--rm', '--network', 'none', '--mount',
    `type=bind,source=${resolve('.')},target=/workspace,readonly`, '--entrypoint', 'php', 'wordpress:cli-php8.3'])
})

it('serializes two suites for the same shared project and releases only its own lock', async () => {
  const {acquireSharedWordPressMutation} = await support()
  const lockDirectory = directory()
  const first = await acquireSharedWordPressMutation({projectName: 'wordpress', lockDirectory, timeoutMs: 100})
  await expect(acquireSharedWordPressMutation({projectName: 'wordpress', lockDirectory, timeoutMs: 20})).rejects.toThrow(/already locked/u)
  const other = await acquireSharedWordPressMutation({projectName: 'other-project', lockDirectory, timeoutMs: 20})
  other()
  first()
  const next = await acquireSharedWordPressMutation({projectName: 'wordpress', lockDirectory, timeoutMs: 20})
  next()
})

it('retains an owner-changed lock instead of deleting another suite’s lock', async () => {
  const {acquireSharedWordPressMutation} = await support()
  const lockDirectory = directory()
  const release = await acquireSharedWordPressMutation({projectName: 'wordpress', lockDirectory, timeoutMs: 20})
  const lock = join(lockDirectory, 'd16-wordpress-vitest-mutation.lock')
  writeFileSync(lock, 'different-owner')
  expect(release).toThrow(/owner changed/u)
  expect(readFileSync(lock, 'utf8')).toBe('different-owner')
})

const wrapperSuites = [
  ['product-fixture-runtime', 'WORDPRESS_PRODUCT_FIXTURE_RUNTIME'],
  ['root-only-migration-runtime', 'WORDPRESS_ROOT_ONLY_RUNTIME'],
  ['seed-runtime', 'WORDPRESS_SEED_RUNTIME'],
  ['seed-homepage-migration-runtime', 'WORDPRESS_SEED_RUNTIME'],
] as const

it.each(wrapperSuites.flatMap(([suite, gate]) => [
  'TIO2_TEST_WORDPRESS_ENV', 'TIO2_TEST_WORDPRESS_COMPOSE', 'TIO2_TEST_WORDPRESS_PROJECT',
].map(override => ({suite, gate, override}))))('$suite rejects $override at import before spawning a process', async ({suite, gate, override}) => {
  const actualSupport = await support()
  const actualCompose = await import('../helpers/wordpress-compose')
  const actualSeedLifecycle = await import('../integration/wordpress/live-seed-lifecycle')
  const filename = resolve('tests/integration/wordpress', suite + '.test.ts')
  const source = readFileSync(filename, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(filename).href))
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText
  const require = createRequire(filename)
  for (const value of ['unexpected-target', '']) {
    const spawned: unknown[][] = []
    const registerSuite = () => undefined
    const describe = Object.assign(registerSuite, {runIf: () => registerSuite, skip: registerSuite})
    const executeImport = () => runInNewContext(compiled, {
      exports: {}, __dirname: dirname(filename), URL,
      process: {env: {[gate]: '1', [override]: value}, pid: process.pid},
      require: (name: string) => name.endsWith('/wordpress-test-support')
        ? {...actualSupport, registerSharedWordPressMutationLock: () => undefined}
        : name.endsWith('/wordpress-compose') ? actualCompose
          : name === './live-seed-lifecycle' ? actualSeedLifecycle
          : name === 'vitest' ? {describe, beforeAll: registerSuite, afterAll: registerSuite, it: registerSuite}
          : name === 'node:child_process' ? {spawnSync: (...args: unknown[]) => {spawned.push(args); throw new Error('Unexpected spawn')}}
            : require(name),
    })
    expect(executeImport).toThrow(/does not support Compose test overrides/u)
    expect(spawned).toEqual([])
  }
})
