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
})
