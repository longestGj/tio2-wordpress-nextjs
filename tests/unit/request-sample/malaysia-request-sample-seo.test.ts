import {describe,expect,it,vi} from 'vitest'
import {buildSitemap} from '@/app/sitemap'
import {buildMalaysiaRequestSampleJsonLd} from '@/lib/seo/request-sample-jsonld'
import {buildMalaysiaRequestSampleMetadata} from '@/lib/seo/request-sample-metadata'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'
import {getSiteConfig} from '@/sites'
import {getPublicRoutes} from '@/sites/public-routes'
import {getSiteTemplateProfile} from '@/sites/template-profiles'
import approvedHomepage from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'

const site=getSiteConfig('tio2-my')
describe('CONV-SAMPLE SEO',()=>{
  it('uses clean canonical and remains noindex without both release conditions',()=>{
    const metadata=buildMalaysiaRequestSampleMetadata(site,{indexingAuthorized:false,env:{VERCEL_ENV:'production',TIO2_MY_REQUEST_SAMPLE_INDEXING_RELEASE_AUTHORIZED:'true'}})
    expect(metadata.title).toBe('Request a Titanium Dioxide Sample | TiO2 Malaysia')
    expect(metadata.description).toBe('Request a Malaysia-origin titanium dioxide sample for technical evaluation by sharing the grade, application, destination and test objective for human review.')
    expect(metadata.alternates).toEqual({canonical:'https://tio2malaysia.com/request-sample/'})
    expect(metadata.robots).toEqual({index:false,follow:false})
    expect(metadata.alternates).not.toHaveProperty('languages')
  })
  it('emits only WebPage and BreadcrumbList without query or form values',()=>{
    const data=buildMalaysiaRequestSampleJsonLd(site) as {'@graph':Array<Record<string,unknown>>}
    expect(data['@graph'].map((node)=>node['@type'])).toEqual(['WebPage','BreadcrumbList'])
    expect(JSON.stringify(data)).not.toMatch(/FAQPage|Product|Offer|business_email|grade_id|\?/u)
  })
  it('keeps the conversion route out of the controlled sitemap before release authorization',async()=>{
    const getSiteProductPage=vi.fn(async()=>null)
    const sitemap=await buildSitemap(site,{
      getHomepage:async()=>toMalaysiaHomepageDto({id:'homepage-my-1',modifiedGmt:'2026-08-31T01:02:03',status:'publish',siteScopes:{nodes:[{slug:'tio2-my'}]},homepageFields:{homepageSchemaVersion:'homepage-v0.4-malaysia'},malaysiaHomepageContractJson:JSON.stringify(approvedHomepage)}),
      getSiteProductPage,getPublicRoutes,getSiteTemplateProfile,
    })
    expect(JSON.stringify(sitemap)).not.toContain('/request-sample')
    expect(getSiteProductPage).not.toHaveBeenCalled()
  })
})
