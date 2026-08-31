import {describe, expect, it} from 'vitest'

import {getPublicRoutes} from '@/sites/public-routes'

describe('M-350 release-controlled sitemap boundary', () => {
  it('keeps the non-indexed implementation candidate outside the controlled public inventory', () => {
    const routes = getPublicRoutes('tio2-my')
    expect(routes.map((route) => route.path)).not.toContain('/products/m-350')
    expect(JSON.stringify(routes)).not.toMatch(/m-510|m-896|m-996|m-2196|cr-901/iu)
  })
})
