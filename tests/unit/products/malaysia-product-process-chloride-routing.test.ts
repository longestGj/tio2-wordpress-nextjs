import {describe, expect, it} from 'vitest'

import {
  loadMalaysiaChlorideProcessRequest,
  resolveMalaysiaChlorideProcessRequest,
} from '@/lib/wordpress/product-process-chloride-v01-registry'

const PATH = '/products/chloride-process-titanium-dioxide/'

describe('PRODUCT-PROC-CL scoped route identity', () => {
  it('resolves only the exact Malaysia site, WordPress scope and route', () => {
    expect(resolveMalaysiaChlorideProcessRequest('tio2-my', 'tio2-my', PATH)).toEqual({
      pageId: 'PRODUCT-PROC-CL', siteScope: 'tio2-my', locale: 'en', path: PATH,
      canonical: 'https://tio2malaysia.com/products/chloride-process-titanium-dioxide/',
    })
    expect(resolveMalaysiaChlorideProcessRequest('tio2-a', 'tio2-my', PATH)).toBeNull()
    expect(resolveMalaysiaChlorideProcessRequest('tio2-my', 'tio2-a', PATH)).toBeNull()
    expect(resolveMalaysiaChlorideProcessRequest('tio2-my', 'tio2-my', '/products/m-350/')).toBeNull()
  })

  it('does not call WordPress for a foreign scope', async () => {
    let reads = 0
    expect(await loadMalaysiaChlorideProcessRequest(
      'tio2-my', 'tio2-a', PATH, async () => { reads += 1; return 'foreign' },
    )).toBeNull()
    expect(reads).toBe(0)
  })
})
