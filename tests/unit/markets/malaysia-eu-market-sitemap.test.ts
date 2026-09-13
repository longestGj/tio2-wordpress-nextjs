import {describe, expect, it, vi} from 'vitest'

import {buildSitemap} from '@/app/sitemap'
import {getSiteConfig} from '@/sites'

describe('MARKET-EU-001 sitemap authorization', () => {
  it('uses the closed Gate 6 publication row instead of an earlier provisional page flag', async () => {
    const getMalaysiaEuMarketPage = vi.fn()
    const sitemap = await buildSitemap(getSiteConfig('tio2-my'), {
      getHomepage: vi.fn(),
      getSiteProductPage: vi.fn(),
      getPublicRoutes: vi.fn(),
      getSiteTemplateProfile: vi.fn(),
      getMalaysiaEuMarketPage,
    })

    expect(sitemap).toContainEqual({
      url: 'https://tio2malaysia.com/markets/european-union/',
      lastModified: new Date('2026-09-13T00:00:00.000Z'),
    })
    expect(getMalaysiaEuMarketPage).not.toHaveBeenCalled()
  })
})
