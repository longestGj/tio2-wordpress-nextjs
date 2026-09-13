import type {Metadata} from 'next'
import type {SiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaRequestSampleMetadata(site:SiteConfig,options:{readonly indexingAuthorized:boolean;readonly seo?:Pick<typeof contract.seo,'title'|'description'>;readonly env?:Readonly<Record<string,string|undefined>>}):Metadata{
  if(site.id!=='tio2-my'||site.wordpressScope!=='tio2-my'||site.url!=='https://tio2malaysia.com')throw new Error('CONV-SAMPLE metadata is available only for tio2-my')
  return buildTio2MyPublicationMetadata('CONV-SAMPLE',options.env)
}
