import type {Metadata} from 'next'
import type {SiteConfig} from '@/sites'
import type {MalaysiaUkMarketPageDto} from '@/lib/wordpress/market-page-uk-v01-types'
import type {JsonLdObject} from './jsonld'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

function canonical(site: SiteConfig, page: MalaysiaUkMarketPageDto): string {
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my' || page.identity.siteScope !== 'tio2-my' ||
    new URL(page.identity.path, site.url).href !== page.seo.canonical) throw new Error('UK Market metadata scope mismatch')
  return page.seo.canonical
}
export function buildMalaysiaUkMarketMetadata(site: SiteConfig, page: MalaysiaUkMarketPageDto, env: Readonly<Record<string,string|undefined>> = process.env): Metadata {
  canonical(site,page)
  return buildTio2MyPublicationMetadata('MARKET-UK-001', env)
}
export function buildMalaysiaUkMarketJsonLd(site: SiteConfig, page: MalaysiaUkMarketPageDto): JsonLdObject {
  const url = canonical(site,page)
  const graph: JsonLdObject[] = [
    {'@type':'WebPage','@id':url+'#webpage',url,name:page.hero.h1,description:page.seo.metaDescription,inLanguage:'en',publisher:{'@id':new URL('/#organization',site.url).href}},
    {'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:page.breadcrumb.map((item,i)=>({
      '@type':'ListItem',position:i+1,name:item.label,item:new URL(item.href,site.url).href,
    }))},
  ]
  const grades=page.grades.groups.flatMap(g=>g.items)
  if(grades.length===6 && grades.every(g=>page.routeReadiness[g.action.targetPageId]===true))graph.push({
    '@type':'ItemList','@id':url+'#grades',numberOfItems:6,
    itemListElement:grades.map((g,i)=>({'@type':'ListItem',position:i+1,name:g.name,url:new URL(g.action.href,site.url).href})),
  })
  return {'@context':'https://schema.org','@graph':graph}
}
