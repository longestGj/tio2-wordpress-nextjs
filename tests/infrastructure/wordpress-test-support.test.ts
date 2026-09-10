import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, expect, it} from 'vitest'

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
