import {describe, expect, it} from 'vitest'

import * as resourceRegistry from '@/lib/wordpress/resource-page-registry'

const PATH = '/resources/chloride-vs-sulfate-titanium-dioxide/'

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

describe('RES-PROC scoped route identity', () => {
  it('resolves the exact Malaysia page identity', () => {
    expect(resolveRequest?.('tio2-my', 'tio2-my', PATH)).toEqual({
      pageId: 'RES-PROC',
      siteScope: 'tio2-my',
      locale: 'en',
      path: PATH,
      canonical:
        'https://tio2malaysia.com/resources/chloride-vs-sulfate-titanium-dioxide/',
    })
  })

  it.each([
    ['tio2-a', 'tio2-my'],
    ['tio2-my', 'tio2-a'],
    ['tio2-b', 'tio2-b'],
    ['', ''],
  ])('rejects site %s with WordPress scope %s before content resolution', (
    siteId,
    wordpressScope,
  ) => {
    expect(resolveRequest?.(siteId, wordpressScope, PATH)).toBeNull()
  })

  it('does not invoke content resolution for another scope', async () => {
    let reads = 0
    const result = await loadRequest?.(
      'tio2-my',
      'tio2-a',
      PATH,
      async () => {
        reads += 1
        return {pageId: 'foreign-resource'}
      },
    )

    expect(result).toBeNull()
    expect(reads).toBe(0)
  })

  it('invokes the downstream loader only after exact scope and route match', async () => {
    let received: unknown
    const result = await loadRequest?.(
      'tio2-my',
      'tio2-my',
      PATH,
      async (identity) => {
        received = identity
        return {pageId: 'RES-PROC'}
      },
    )

    expect(result).toEqual({pageId: 'RES-PROC'})
    expect(received).toMatchObject({pageId: 'RES-PROC', siteScope: 'tio2-my'})
  })
})
