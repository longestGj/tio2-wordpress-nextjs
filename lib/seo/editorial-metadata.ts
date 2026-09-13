import type {Metadata} from 'next'
import type {SiteConfig} from '@/sites'
import type {EditorialContract} from '@/lib/editorial/editorial-types'
import type {JsonLdObject} from './jsonld'
import registry from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-page-registry.json'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'
import {getTio2MyPublicationPage} from './tio2-my-publication-inventory'

function canonical(site:SiteConfig,page:EditorialContract):string {
  if(site.id!=='tio2-my' || site.wordpressScope!=='tio2-my' || page.identity.siteScope!=='tio2-my') throw new Error('Editorial metadata scope mismatch')
  if(page.identity.locale!=='en') throw new Error('Editorial metadata locale mismatch')
  if(['RES-CHEMOURS','RES-R706'].includes(page.identity.pageId)) {
    const entry=registry.entries.find(item=>item.pageId===page.identity.pageId)
    const expectedType=page.identity.pageId==='RES-CHEMOURS'?'TechArticle':'WebPage'
    if(!entry?.publicMappingAllowed || entry.canonicalPath!==page.identity.path || page.identity.provisional ||
      page.seo.canonical!=='https://tio2malaysia.com'+entry.canonicalPath || page.seo.schemaType!==expectedType || page.seo.schemaItems) throw new Error('Editorial candidate mapping or Schema mismatch')
  }
  const url=new URL(page.identity.path,site.url).href
  if(page.seo.canonical!==null && url!==page.seo.canonical) throw new Error('Editorial canonical mismatch')
  return url
}
export function buildEditorialMetadata(site:SiteConfig,page:EditorialContract,env:Readonly<Record<string,string|undefined>>=process.env):Metadata {
  canonical(site,page)
  return buildTio2MyPublicationMetadata(page.identity.pageId,env)
}
export function buildEditorialJsonLd(site:SiteConfig,page:EditorialContract & {readonly unavailableInternalPaths?:readonly string[]}):JsonLdObject|null {
  const url=canonical(site,page)
  const publication=getTio2MyPublicationPage(page.identity.pageId)
  const publishedByGate6=publication?.indexingAuthorized===true && publication.canonical===url
  if((page.identity.provisional && !publishedByGate6) || (page.seo.schemaType==='none' && !publishedByGate6) || (!page.seo.canonical && !publishedByGate6)) return null
  const breadcrumb=page.breadcrumb.filter(item=>!page.unavailableInternalPaths?.includes(item.href))
  const primarySchemaType=publication?.schemaTypes.find(type=>!['BreadcrumbList','ItemList'].includes(type)) ?? page.seo.schemaType ?? 'WebPage'
  const includeItemList=publication?.schemaTypes.includes('ItemList') ?? Boolean(page.seo.schemaItems)
  return {'@context':'https://schema.org','@graph':[
    {'@type':primarySchemaType,'@id':`${url}#webpage`,url,name:page.heading,description:publication?.metaDescription??page.seo.metaDescription,inLanguage:'en',isPartOf:{'@id':new URL('/#website',site.url).href},breadcrumb:{'@id':`${url}#breadcrumb`}},
    {'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:breadcrumb.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.label,item:new URL(item.href,site.url).href}))},
    ...(includeItemList&&page.seo.schemaItems?[{'@type':'ItemList','@id':`${url}#grades`,numberOfItems:page.seo.schemaItems.length,itemListElement:page.seo.schemaItems.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,url:new URL(item.href,site.url).href}))}]:[]),
  ]}
}
