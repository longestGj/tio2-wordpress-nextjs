import {describe, expect, it} from 'vitest'

import {buildSitemap} from '@/app/sitemap'
import {getSiteConfig} from '@/sites'

describe('PRODUCT-000 sitemap release control', () => {
  it('includes Products under the closed Gate 6 publication contract', async () => {
    const sitemap = await buildSitemap(getSiteConfig('tio2-my'))
    expect(sitemap.map(({url}) => url)).toContain('https://tio2malaysia.com/products/')
    expect(sitemap).toHaveLength(57)
  })
})
