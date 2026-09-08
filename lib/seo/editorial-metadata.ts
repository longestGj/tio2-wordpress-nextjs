import type {Metadata} from 'next'
import type {SiteConfig} from '@/sites'
import type {EditorialContract} from '@/lib/editorial/editorial-types'
import type {JsonLdObject} from './jsonld'

function canonical(site:SiteConfig,page:EditorialContract):string {
  if(site.id!=='tio2-my' || site.wordpressScope!=='tio2-my' || page.identity.siteScope!=='tio2-my') throw new Error('Editorial metadata scope mismatch')
  const url=new URL(page.identity.path,site.url).href
  if(page.seo.canonical!==null && url!==page.seo.canonical) throw new Error('Editorial canonical mismatch')
  return url
}
export function buildEditorialMetadata(site:SiteConfig,page:EditorialContract):Metadata {
  const url=canonical(site,page)
  return {title:{absolute:page.seo.title},description:page.seo.metaDescription,alternates:page.seo.canonical===null?{canonical:undefined}:{canonical:url},robots:{index:false,follow:false},
    openGraph:{type:'website',url,siteName:site.name,title:page.seo.title,description:page.seo.metaDescription,images:[]},
    twitter:{card:'summary',title:page.seo.title,description:page.seo.metaDescription,images:[]}}
}
export function buildEditorialJsonLd(site:SiteConfig,page:EditorialContract & {readonly unavailableInternalPaths?:readonly string[]}):JsonLdObject|null {
  const url=canonical(site,page)
  if(page.seo.schemaType==='none' || page.seo.canonical===null) return null
  const breadcrumb=page.breadcrumb.filter(item=>!page.unavailableInternalPaths?.includes(item.href))
  return {'@context':'https://schema.org','@graph':[
    {'@type':page.seo.schemaType??'WebPage','@id':`${url}#webpage`,url,name:page.heading,description:page.seo.metaDescription,inLanguage:'en',isPartOf:{'@id':new URL('/#website',site.url).href},breadcrumb:{'@id':`${url}#breadcrumb`}},
    {'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:breadcrumb.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.label,item:new URL(item.href,site.url).href}))},
    ...(page.seo.schemaItems?[{'@type':'ItemList','@id':`${url}#grades`,numberOfItems:page.seo.schemaItems.length,itemListElement:page.seo.schemaItems.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,url:new URL(item.href,site.url).href}))}]:[]),
  ]}
}
