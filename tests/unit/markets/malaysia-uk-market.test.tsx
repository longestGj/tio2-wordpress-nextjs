// @vitest-environment jsdom
import {cleanup, render} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-uk-001.json'
import {toMalaysiaUkMarketPageDto} from '@/lib/wordpress/market-page-uk-v01-dto'
import {MalaysiaUkMarketPage} from '@/components/sites/tio2-my/markets/malaysia-uk-market-page'
import {buildMalaysiaUkMarketMetadata, buildMalaysiaUkMarketJsonLd} from '@/lib/seo/market-uk-metadata'
import {getSiteConfig as getSite} from '@/sites'

afterEach(cleanup)
const source = () => ({id:'uk-1', modifiedGmt:'2026-09-05T01:02:03',status:'publish',siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:'/markets/united-kingdom'},malaysiaUkMarketContractJson:JSON.stringify(contract),routeReadiness:Object.fromEntries(contract.routeRegistry.map(r=>[r.targetPageId,false]))})
describe('UK server contract',()=>{
  it('fails closed for wrong/multiple/missing scope, draft, missing payload, modified text and extra process facts',()=>{
    for(const scopes of [[],[{slug:'tio2-a'}],[{slug:'tio2-my'},{slug:'tio2-b'}]])expect(()=>toMalaysiaUkMarketPageDto({...source(),siteScopes:{nodes:scopes}})).toThrow()
    expect(()=>toMalaysiaUkMarketPageDto({...source(),status:'draft'})).toThrow()
    expect(()=>toMalaysiaUkMarketPageDto({...source(),malaysiaUkMarketContractJson:null})).toThrow()
    expect(()=>toMalaysiaUkMarketPageDto({...source(),malaysiaUkMarketContractJson:JSON.stringify({...contract,process:'chloride'})})).toThrow()
    expect(()=>toMalaysiaUkMarketPageDto({...source(),routeReadiness:{...source().routeReadiness,'GRADE-M350':'true'}})).toThrow()
  })
  it('renders exact approved content with real links, separate RFQ surfaces and no current self-link',()=>{
    const {container}=render(<MalaysiaUkMarketPage marketPage={toMalaysiaUkMarketPageDto(source())}/> )
    const main=container.querySelector('main')!
    expect(main.querySelectorAll('h1')).toHaveLength(1)
    expect([...main.querySelectorAll('[data-module]')].map(n=>n.getAttribute('data-module'))).toEqual(['breadcrumb','hero','direct-answer','application-paths','representative-grades','territory','checklist','documents','origin','trade','buyer-questions','final-rfq'])
    const crumb=main.querySelector('nav')!
    expect(crumb.querySelectorAll('li')).toHaveLength(3)
    expect(crumb.querySelectorAll('a')).toHaveLength(2)
    expect(crumb.querySelector('[aria-current=page]')?.tagName).toBe('SPAN')
    expect(crumb.querySelector('[aria-current=page]')?.textContent).toBe('United Kingdom')
    expect(main.querySelectorAll('a[href="/request-a-quote/?market=United%20Kingdom&source_page=MARKET-UK-001"]')).toHaveLength(2)
    for(const a of container.querySelectorAll('header a[href*="request-a-quote"],footer a[href*="request-a-quote"]'))expect(a.getAttribute('href')).toBe('/request-a-quote/')
    expect(main.querySelectorAll('[data-module=application-paths] article a')).toHaveLength(5)
    expect(main.querySelectorAll('[data-module=representative-grades] article a')).toHaveLength(6)
    for(const q of contract.buyerQuestions.items)expect(main.textContent).toContain(q.answer)
    expect(main.querySelectorAll('details')).toHaveLength(6)
    expect(main.querySelectorAll('details[open]')).toHaveLength(2)
    expect(main.textContent?.split('A Certificate of Origin is available upon request.')).toHaveLength(2)
    expect(main.textContent).not.toMatch(/AD0086|UK-specific|CURRENT|site_scope|NO_PUBLIC_MAPPING/)
    expect(main.querySelectorAll('img,a[href*="anti-dumping"]')).toHaveLength(0)
  })
  it('keeps canonical scoped, never indexes, and emits Grade ItemList only when all six targets are ready',()=>{
    const dto=toMalaysiaUkMarketPageDto(source())
    const site=getSite('tio2-my')
    const metadata=buildMalaysiaUkMarketMetadata(site,dto)
    expect(metadata.alternates).toEqual({canonical:'https://tio2malaysia.com/markets/united-kingdom/'})
    expect(metadata.robots).toEqual({index:false,follow:false})
    expect(metadata.title).toBe('Malaysia Titanium Dioxide Supplier for UK Buyers | TiO2 Malaysia')
    const graph=buildMalaysiaUkMarketJsonLd(site,dto)['@graph'] as Record<string,unknown>[]
    expect(graph.map(n=>n['@type'])).toEqual(['WebPage','BreadcrumbList'])
    const ready=source();for(const id of ['GRADE-M350','GRADE-M510','GRADE-M896','GRADE-M200','GRADE-M108','GRADE-M210'])ready.routeReadiness[id]=true
    const available=buildMalaysiaUkMarketJsonLd(site,toMalaysiaUkMarketPageDto(ready))['@graph'] as Record<string,unknown>[]
    expect(available[2]).toMatchObject({'@type':'ItemList',numberOfItems:6})
    expect((available[2].itemListElement as {name:string}[]).map(i=>i.name)).toEqual(['M-350','M-510','M-896','M-200','M-108','M-210'])
    expect(()=>buildMalaysiaUkMarketMetadata(getSite('tio2-a'),dto)).toThrow()
  })
})
