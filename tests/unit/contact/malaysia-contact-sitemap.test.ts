import {describe, expect, it, vi} from 'vitest'

import {buildSitemap} from '@/app/sitemap'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'
import {getSiteConfig} from '@/sites'
import {getPublicRoutes} from '@/sites/public-routes'
import {getSiteTemplateProfile} from '@/sites/template-profiles'
import approvedHomepage from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'

describe('CONTACT-001 sitemap release control', () => {
  it('keeps Contact out of the public inventory while live-form release blockers remain open', async () => {
    const getSiteProductPage = vi.fn(async () => null)
    const sitemap = await buildSitemap(getSiteConfig('tio2-my'), {
      getHomepage: async () => toMalaysiaHomepageDto({
        id: 'homepage-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
        siteScopes: {nodes: [{slug: 'tio2-my'}]},
        homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
        malaysiaHomepageContractJson: JSON.stringify(approvedHomepage),
      }),
      getSiteProductPage,
      getPublicRoutes,
      getSiteTemplateProfile,
    })

    expect(sitemap.map(({url}) => url)).not.toContain('https://tio2malaysia.com/contact/')
    expect(getPublicRoutes('tio2-my').some(({path}) => String(path) === '/contact/')).toBe(false)
    expect(getSiteProductPage).not.toHaveBeenCalled()
  })
})
