import {describe,expect,it} from 'vitest'
import {buildSitemap} from '@/app/sitemap'
import {buildMalaysiaRequestSampleJsonLd} from '@/lib/seo/request-sample-jsonld'
import {buildMalaysiaRequestSampleMetadata} from '@/lib/seo/request-sample-metadata'
import {getSiteConfig} from '@/sites'

const site=getSiteConfig('tio2-my')
describe('CONV-SAMPLE SEO',()=>{
  it('uses the closed Gate 6 page authorization in production',()=>{
    const metadata=buildMalaysiaRequestSampleMetadata(site,{indexingAuthorized:false,env:{VERCEL_ENV:'production',TIO2_MY_REQUEST_SAMPLE_INDEXING_RELEASE_AUTHORIZED:'true'}})
    expect(metadata.title).toBe('Request a Titanium Dioxide Sample | TiO2 Malaysia')
    expect(metadata.description).toBe('Request a Malaysia-origin titanium dioxide sample for technical evaluation by sharing the grade, application, destination and test objective for human review.')
    expect(metadata.alternates).toEqual({canonical:'https://tio2malaysia.com/request-sample/'})
    expect(metadata.robots).toEqual({index:true,follow:true})
    expect(metadata.alternates).not.toHaveProperty('languages')
  })
  it('emits only WebPage and BreadcrumbList without query or form values',()=>{
    const data=buildMalaysiaRequestSampleJsonLd(site) as {'@graph':Array<Record<string,unknown>>}
    expect(data['@graph'].map((node)=>node['@type'])).toEqual(['WebPage','BreadcrumbList'])
    expect(JSON.stringify(data)).not.toMatch(/FAQPage|Product|Offer|business_email|grade_id|\?/u)
  })
  it('includes the conversion route in the closed Gate 6 sitemap',async()=>{
    const sitemap=await buildSitemap(site)
    expect(sitemap.map(({url})=>url)).toContain('https://tio2malaysia.com/request-sample/')
  })
})
