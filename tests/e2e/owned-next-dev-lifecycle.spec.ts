import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {resolve} from 'node:path'

import {expect, test} from '@playwright/test'

import {
  startOwnedNextDev,
  type OwnedNextDevRuntime,
} from './support/owned-next-dev'

test.use({trace: 'off'})

const tsconfigPath = resolve('tsconfig.json')
const globalLockPath = resolve('.tmp/task-9-next-dev-lifecycle.lock')
const editorialDistPath = resolve('.next-task-9-editorial')
const productDistPath = resolve('.next-task-9-product')
const editorialLockPath = resolve('.tmp/task-9-editorial-preview.lock')
const productLockPath = resolve('.tmp/task-9-product-preview.lock')
const environment = {
  PREVIEW_SECRET: 'task-9-lifecycle-preview-secret',
  REVALIDATION_SECRET: 'task-9-lifecycle-revalidation-secret',
  SITE_ID: 'tio2-a',
  WORDPRESS_GRAPHQL_URL: 'http://127.0.0.1:9/graphql',
  WORDPRESS_PREVIEW_SECRET: 'task-9-lifecycle-preview-secret',
  WORDPRESS_PREVIEW_URL:
    'http://127.0.0.1:9/wp-json/tio2/v1/preview',
} as const

async function stopRuntime(runtime: OwnedNextDevRuntime | undefined): Promise<void> {
  await runtime?.stop()
}

test('a cross-ID contender cannot mutate or clean shared state while an owner remains usable', async () => {
  test.setTimeout(180_000)
  const originalTsconfig = readFileSync(tsconfigPath, 'utf8')
  let owner: OwnedNextDevRuntime | undefined
  let contender: OwnedNextDevRuntime | undefined
  let rejection: unknown

  try {
    owner = await startOwnedNextDev({environment, runtimeId: 'editorial'})
    const ownedTsconfig = readFileSync(tsconfigPath, 'utf8')
    expect(ownedTsconfig).not.toBe(originalTsconfig)
    expect(existsSync(editorialDistPath)).toBe(true)

    try {
      contender = await startOwnedNextDev({environment, runtimeId: 'product'})
    } catch (error) {
      rejection = error
    }

    expect(contender).toBeUndefined()
    expect(rejection).toEqual(
      new Error('A Task 9 owned Next dev lifecycle is already active'),
    )
    expect(readFileSync(tsconfigPath, 'utf8')).toBe(ownedTsconfig)
    expect(readFileSync(globalLockPath, 'utf8')).toBe(String(process.pid))
    expect(existsSync(editorialDistPath)).toBe(true)
    expect(existsSync(productLockPath)).toBe(false)
    expect(existsSync(productDistPath)).toBe(false)

    const winnerResponse = await fetch(`${owner.baseUrl}/robots.txt`, {
      cache: 'no-store',
    })
    expect(winnerResponse.ok).toBe(true)
  } finally {
    await stopRuntime(contender)
    await stopRuntime(owner)
  }

  expect(readFileSync(tsconfigPath, 'utf8')).toBe(originalTsconfig)
  expect(existsSync(globalLockPath)).toBe(false)
  expect(existsSync(editorialLockPath)).toBe(false)
  expect(existsSync(productLockPath)).toBe(false)
  expect(existsSync(editorialDistPath)).toBe(false)
  expect(existsSync(productDistPath)).toBe(false)

  let nextOwner: OwnedNextDevRuntime | undefined
  try {
    nextOwner = await startOwnedNextDev({environment, runtimeId: 'product'})
    const response = await fetch(`${nextOwner.baseUrl}/robots.txt`, {
      cache: 'no-store',
    })
    expect(response.ok).toBe(true)
  } finally {
    await stopRuntime(nextOwner)
  }
  expect(readFileSync(tsconfigPath, 'utf8')).toBe(originalTsconfig)
  expect(existsSync(globalLockPath)).toBe(false)
})

test('an unverified pre-existing global lock fails closed and remains untouched', async () => {
  test.setTimeout(120_000)
  const originalTsconfig = readFileSync(tsconfigPath, 'utf8')
  const unverifiedOwner = '999999-unverified-owner'
  mkdirSync(resolve('.tmp'), {recursive: true})
  writeFileSync(globalLockPath, unverifiedOwner)
  let runtime: OwnedNextDevRuntime | undefined
  let rejection: unknown

  try {
    try {
      runtime = await startOwnedNextDev({environment, runtimeId: 'product'})
    } catch (error) {
      rejection = error
    }
    expect(runtime).toBeUndefined()
    expect(rejection).toEqual(
      new Error('A Task 9 owned Next dev lifecycle is already active'),
    )
    expect(readFileSync(globalLockPath, 'utf8')).toBe(unverifiedOwner)
    expect(readFileSync(tsconfigPath, 'utf8')).toBe(originalTsconfig)
    expect(existsSync(productLockPath)).toBe(false)
    expect(existsSync(productDistPath)).toBe(false)
  } finally {
    await stopRuntime(runtime)
    rmSync(globalLockPath, {force: true})
  }
})
