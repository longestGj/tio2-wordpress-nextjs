import {describe, expect, it} from 'vitest'

import * as resourceRegistry from '@/lib/wordpress/resource-page-registry'

const resolveRequest = (
  resourceRegistry as unknown as {
    readonly resolveMalaysiaResourcePageRequest?: (
      siteId: string,
      wordpressScope: string,
      path: string,
    ) => unknown
  }
).resolveMalaysiaResourcePageRequest

const loadRequest = (
  resourceRegistry as unknown as {
    readonly loadMalaysiaResourcePageRequest?: <T>(
      siteId: string,
      wordpressScope: string,
      path: string,
      loader: (identity: unknown) => Promise<T>,
    ) => Promise<T | null>
  }
).loadMalaysiaResourcePageRequest

describe('RES-ORIGIN scoped route identity', () => {
  it('resolves the exact Malaysia page identity', () => {
    expect(resolveRequest).toBeTypeOf('function')
    expect(resolveRequest?.(
      'tio2-my',
      'tio2-my',
      '/resources/non-china-titanium-dioxide/',
    )).toEqual({
      pageId: 'RES-ORIGIN',
      siteScope: 'tio2-my',
      locale: 'en',
      path: '/resources/non-china-titanium-dioxide/',
      canonical: 'https://tio2malaysia.com/resources/non-china-titanium-dioxide/',
    })
  })

  it.each([
    ['tio2-a', 'tio2-my'],
    ['tio2-my', 'tio2-a'],
    ['tio2-b', 'tio2-b'],
  ])('rejects site %s with WordPress scope %s before content resolution', (
    siteId,
    wordpressScope,
  ) => {
    expect(resolveRequest).toBeTypeOf('function')
    expect(resolveRequest?.(
      siteId,
      wordpressScope,
      '/resources/non-china-titanium-dioxide/',
    )).toBeNull()
  })

  it('rejects any unregistered or non-canonical resource path', () => {
    expect(resolveRequest).toBeTypeOf('function')
    expect(resolveRequest?.('tio2-my', 'tio2-my', '/resources/unknown/')).toBeNull()
    expect(resolveRequest?.(
      'tio2-my',
      'tio2-my',
      '/resources/non-china-titanium-dioxide',
    )).toBeNull()
  })

  it('does not invoke content resolution for wrong-scope-only data', async () => {
    expect(loadRequest).toBeTypeOf('function')
    let reads = 0
    const result = await loadRequest?.(
      'tio2-my',
      'tio2-a',
      '/resources/non-china-titanium-dioxide/',
      async () => {
        reads += 1
        return {body: 'foreign content'}
      },
    )

    expect(result).toBeNull()
    expect(reads).toBe(0)
  })

  it('invokes the downstream loader only after the exact scope and route pass', async () => {
    expect(loadRequest).toBeTypeOf('function')
    let received: unknown
    const result = await loadRequest?.(
      'tio2-my',
      'tio2-my',
      '/resources/non-china-titanium-dioxide/',
      async (identity) => {
        received = identity
        return {pageId: 'RES-ORIGIN'}
      },
    )

    expect(result).toEqual({pageId: 'RES-ORIGIN'})
    expect(received).toMatchObject({pageId: 'RES-ORIGIN', siteScope: 'tio2-my'})
  })
})
