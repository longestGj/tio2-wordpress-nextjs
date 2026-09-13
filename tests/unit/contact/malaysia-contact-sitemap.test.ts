import {describe, expect, it} from 'vitest'

import {buildSitemap} from '@/app/sitemap'
import {getSiteConfig} from '@/sites'

describe('CONTACT-001 sitemap release control', () => {
  it('includes Contact under the closed Gate 6 publication contract', async () => {
    const sitemap = await buildSitemap(getSiteConfig('tio2-my'))
    expect(sitemap.map(({url}) => url)).toContain('https://tio2malaysia.com/contact/')
    expect(sitemap).toHaveLength(57)
  })
})
