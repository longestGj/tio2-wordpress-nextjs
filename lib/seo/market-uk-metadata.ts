import type {Metadata} from 'next'
import type {SiteConfig} from '@/sites'
import type {MalaysiaUkMarketPageDto} from '@/lib/wordpress/market-page-uk-v01-types'
import type {JsonLdObject} from './jsonld'

function canonical(site: SiteConfig, page: MalaysiaUkMarketPageDto): string {
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my' || page.identity.siteScope !== 'tio2-my' ||
    new URL(page.identity.path, site.url).href !== page.seo.canonical) throw new Error('UK Market metadata scope mismatch')
  return page.seo.canonical
}
export function buildMalaysiaUkMarketMetadata(site: SiteConfig, page: MalaysiaUkMarketPageDto): Metadata {
  const url = canonical(site,page)
  // Gate 8 grants no release/index permission. Release requires a separate reviewed change.
  return {title:page.seo.title, description:page.seo.metaDescription,
    alternates:{canonical:url}, robots:{index:false,follow:false},
    openGraph:{type:'website',url,siteName:site.name,title:page.seo.ogTitle,description:page.seo.metaDescription,images:[]}}
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
