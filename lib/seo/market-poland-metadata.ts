import type {Metadata} from 'next'
import type {SiteConfig} from '@/sites'
import type {MalaysiaPolandMarketPageDto} from '@/lib/wordpress/market-page-poland-v01-types'
import type {JsonLdObject} from './jsonld'

function canonical(site:SiteConfig,page:MalaysiaPolandMarketPageDto):string {
  if(site.id!=='tio2-my'||site.wordpressScope!=='tio2-my'||page.identity.siteScope!=='tio2-my'||
    new URL(page.identity.path,site.url).href!==page.seo.canonical) throw new Error('Poland metadata scope mismatch')
  return page.seo.canonical
}
export function buildMalaysiaPolandMarketMetadata(site:SiteConfig,page:MalaysiaPolandMarketPageDto):Metadata {
  const url=canonical(site,page)
  return {title:page.seo.title,description:page.seo.description,alternates:{canonical:url},robots:{index:false,follow:false},
    openGraph:{type:'website',url,siteName:site.name,title:page.seo.title,description:page.seo.description,images:[]},
    twitter:{card:'summary',title:page.seo.title,description:page.seo.description,images:[]}}
}
export function buildMalaysiaPolandMarketJsonLd(site:SiteConfig,page:MalaysiaPolandMarketPageDto):JsonLdObject {
  const url=canonical(site,page)
  return {'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':url+'#webpage',url,name:page.modules[0]!.heading,description:page.seo.description,inLanguage:'en',
      isPartOf:{'@id':new URL('/#website',site.url).href},publisher:{'@id':new URL('/#organization',site.url).href}},
    {'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:page.breadcrumb.map((item,index)=>({
      '@type':'ListItem',position:index+1,name:item.label,item:new URL(item.href,site.url).href,
    }))},
  ]}
}
