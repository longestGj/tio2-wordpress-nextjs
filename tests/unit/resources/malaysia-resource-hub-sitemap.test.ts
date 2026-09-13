import {describe, expect, it} from 'vitest'

import {buildSitemap} from '@/app/sitemap'
import {getSiteConfig} from '@/sites'

describe('RES-000 sitemap release control', () => {
  it('includes /resources under the closed Gate 6 publication contract', async () => {
    const sitemap = await buildSitemap(getSiteConfig('tio2-my'))
    expect(sitemap.map(({url}) => url)).toContain('https://tio2malaysia.com/resources/')
    expect(sitemap).toHaveLength(57)
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
