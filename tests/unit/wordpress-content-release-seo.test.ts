import {it,expect} from 'vitest'
import {getSiteConfig} from '@/sites'
import {buildMalaysiaRequestSampleMetadata} from '@/lib/seo/request-sample-metadata'
import {buildMalaysiaRequestDocumentsMetadata} from '@/lib/seo/request-documents-metadata'
import {buildMalaysiaRfqMetadata} from '@/lib/seo/rfq-metadata'
import {buildMalaysiaRequestSampleJsonLd} from '@/lib/seo/request-sample-jsonld'
import {buildMalaysiaRequestDocumentsJsonLd} from '@/lib/seo/request-documents-jsonld'
import {buildMalaysiaRfqJsonLd} from '@/lib/seo/rfq-jsonld'
import sample from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'
import documents from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json'
import rfq from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'
it.each([[buildMalaysiaRequestSampleMetadata,buildMalaysiaRequestSampleJsonLd,sample],[buildMalaysiaRequestDocumentsMetadata,buildMalaysiaRequestDocumentsJsonLd,documents],[buildMalaysiaRfqMetadata,buildMalaysiaRfqJsonLd,rfq]] as const)('uses delivered conversion-page SEO for metadata and JSON-LD',(metadata,jsonld,contract)=>{
 const seo={...contract.seo,title:'Updated CMS title',description:'Updated CMS description.'}
 const site=getSiteConfig('tio2-my')
 expect(metadata(site,{indexingAuthorized:false,seo})).toMatchObject({title:seo.title,description:seo.description,openGraph:{title:seo.title,description:seo.description}})
 expect(JSON.stringify(jsonld(site,seo))).toContain('Updated CMS title')
 expect(JSON.stringify(jsonld(site,seo))).toContain('Updated CMS description.')
 for (const environment of ['production','preview']) {
  const env={NODE_ENV:'production',VERCEL_ENV:environment}
  const baseline=metadata(site,{indexingAuthorized:false,env})
  const delivered=metadata(site,{indexingAuthorized:false,seo,env})
  expect(delivered.alternates).toEqual(baseline.alternates)
  expect(delivered.robots).toEqual(baseline.robots)
  expect(delivered.twitter).toMatchObject({title:seo.title,description:seo.description})
 }
 expect(()=>metadata(getSiteConfig('tio2-a'),{indexingAuthorized:false,seo})).toThrow('only for tio2-my')
})
