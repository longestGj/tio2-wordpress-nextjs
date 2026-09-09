import {describe, expect, it, vi} from 'vitest'

import {buildSitemap} from '@/app/sitemap'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'
import {getSiteConfig} from '@/sites'
import {getPublicRoutes} from '@/sites/public-routes'
import {getSiteTemplateProfile} from '@/sites/template-profiles'
import approvedHomepage from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'

describe('RES-000 sitemap release control', () => {
  it('keeps /resources out while sitemap authorization is false', async () => {
    const getSiteProductPage = vi.fn(async () => null)
    const sitemap = await buildSitemap(getSiteConfig('tio2-my'), {
      getHomepage: async () => toMalaysiaHomepageDto({
        id: 'homepage-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
        siteScopes: {nodes: [{slug: 'tio2-my'}]},
        homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
        malaysiaHomepageContractJson: JSON.stringify(approvedHomepage),
      }),
      getSiteProductPage, getPublicRoutes, getSiteTemplateProfile,
    })
    expect(sitemap).toEqual([{url: 'https://tio2malaysia.com/', lastModified: new Date('2026-08-31T01:02:03.000Z')}])
    expect(JSON.stringify(sitemap)).not.toContain('/resources')
    expect(getSiteProductPage).not.toHaveBeenCalled()
  })
})

import {buildMalaysiaResourceReleaseSitemap, buildMalaysiaResourceHubJsonLd} from '@/lib/seo/resource-hub-jsonld'
import {projectEligibleMalaysiaResources, toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import {malaysiaResourceHubSource} from '@/tests/fixtures/tio2-my-resource-hub'
import resourceContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

it.each([undefined, ...resourceContract.resourceRelations.map(item=>item.pageId)])('shares cards, ItemList and candidate sitemap eligibility with revoked %s', revoked=>{
 const relations=resourceContract.resourceRelations.map(item=>item.pageId===revoked?{...item,publicEligibilityStatus:'REVOKED'}:item)
 const hub=toMalaysiaResourceHubDto({...malaysiaResourceHubSource(),resourceProjection:projectEligibleMalaysiaResources(relations)})
 const expected=resourceContract.resourceRelations.filter(item=>item.pageId!==revoked).map(item=>item.canonicalUrl)
 const cards=hub.resourceGroups.flatMap(group=>group.items).map(item=>'https://tio2malaysia.com'+item.href)
 const list=(buildMalaysiaResourceHubJsonLd(getSiteConfig('tio2-my'),hub)['@graph'] as Record<string,unknown>[]).find(node=>node['@type']==='ItemList')!
 expect(cards).toEqual(expected)
 expect((list.itemListElement as {url:string}[]).map(item=>item.url)).toEqual(expected)
 expect(buildMalaysiaResourceReleaseSitemap(hub).map(item=>item.url)).toEqual(expected)
 expect(hub.releaseControls).toEqual({indexingAuthorized:false,sitemapAuthorized:false})
})
