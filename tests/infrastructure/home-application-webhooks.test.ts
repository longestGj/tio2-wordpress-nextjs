import {spawnSync} from 'node:child_process'
import {beforeAll, describe, expect, it} from 'vitest'
import {isolatedPhpArgs} from '@/tests/helpers/wordpress-test-support'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

type Delivery = {url: string; siteIds: string[]; paths: string[]; contentId: number; entityIds: number[]; signed: boolean}

describe('Malaysia home and application WordPress webhook mutations', () => {
  let output: Record<string, Delivery[]>

  beforeAll(() => {
    const result = spawnSync('docker', [
      ...isolatedPhpArgs(process.cwd()),
      '/workspace/tests/infrastructure/php/home-application-webhook-mutations.php',
    ], {encoding: 'utf8', timeout: 60_000})
    if (result.status !== 0) throw new Error(`PHP webhook harness failed (${result.status}):\n${result.stdout}\n${result.stderr}`)
    output = JSON.parse(result.stdout) as Record<string, Delivery[]>
  })

  it.each([
    ['home-publish', '/'], ['home-update', '/'], ['home-withdraw', '/'],
    ['application-publish', '/applications'], ['application-update', '/applications'],
    ['application-withdraw', '/applications'],
  ])('sends the signed, scoped %s status transition', (name, path) => {
    expect(output[name], name).toEqual([{
      url: 'http://127.0.0.1:3015/api/revalidate',
      siteIds: ['tio2-my'], paths: [path], contentId: 42,
      entityIds: path === '/' ? [] : [42], signed: true,
    }])
  })

  it.each([
    ['home-meta-before', '/'], ['home-meta-after', '/'],
    ['application-meta-before', '/applications'], ['application-meta-after', '/applications'],
  ])('sends a signed, scoped %s event without post-save', (name, path) => {
    expect(output[name], name).toEqual([{
      url: 'http://127.0.0.1:3015/api/revalidate',
      siteIds: ['tio2-my'], paths: [path], contentId: 42,
      entityIds: path === '/' ? [] : [42], signed: true,
    }])
  })

  it.each([
    'application-site-a', 'application-site-b', 'application-mixed-scope',
    'home-wrong-meta', 'application-wrong-meta', 'home-unrelated-meta',
    'application-unrelated-meta', 'home-my-meta-on-a', 'home-my-meta-on-b',
  ])('does not send a MY singleton event for %s', name => {
    expect(output[name], name).toEqual([])
  })

  it.each(['tio2-a', 'tio2-b'])('preserves the %s homepage status event', siteId => {
    expect(output[`home-${siteId}-publish`]).toEqual([{
      url: `http://127.0.0.1:3015/${siteId}/api/revalidate`,
      siteIds: [siteId], paths: ['/'], contentId: 42, entityIds: [], signed: true,
    }])
  })
})
