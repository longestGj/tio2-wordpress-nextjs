// @vitest-environment jsdom
import {readFileSync} from 'node:fs'
import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'
import {NextRequest} from 'next/server'
import {vi} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json'
import {toMalaysiaPolandMarketPageDto} from '@/lib/wordpress/market-page-poland-v01-dto'
import {MalaysiaPolandMarketPage} from '@/components/sites/tio2-my/markets/malaysia-poland-market-page'
import {buildMalaysiaPolandMarketMetadata, buildMalaysiaPolandMarketJsonLd} from '@/lib/seo/market-poland-metadata'
import {getSiteConfig} from '@/sites'
import {proxy} from '@/proxy'
import {marketPageContentTag} from '@/lib/wordpress/cache-tags'

function source(payload: unknown = contract) {
  return {id:'poland-1',modifiedGmt:'2026-09-07T01:02:03',status:'publish',
    siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:'/markets/poland'},
    malaysiaPolandMarketContractJson:JSON.stringify(payload)}
}
afterEach(() => {cleanup();vi.unstubAllEnvs()})

describe('Poland content is rendered from the scoped CMS record', () => {
  it('renders every approved heading, paragraph and main action without adding a form or FAQ', () => {
    render(<MalaysiaPolandMarketPage marketPage={toMalaysiaPolandMarketPageDto(source())}/> )
    const main = screen.getByRole('main')
    const copy = readFileSync('tests/fixtures/markets/poland/approved-copy.md','utf8').replace(/<!--[\s\S]*?-->/g,'')
    const lines = copy.split(/\r?\n/).filter(line => line.trim())
    for (const line of lines) {
      if (line.startsWith('[Home]')) continue
      if (/^#{1,3} /.test(line)) {
        expect(within(main).getByRole('heading',{name:line.replace(/^#+ /,'')})).not.toBeNull()
      } else if (/^\[/.test(line)) {
        const [,label,href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(line)!
        for (const link of within(main).getAllByRole('link',{name:label})) expect(link.getAttribute('href')).toBe(href)
      } else {
        expect(within(main).getByText(line,{exact:true})).not.toBeNull()
      }
    }
    expect(main.querySelectorAll('section[data-module]')).toHaveLength(5)
    expect(main.querySelectorAll('h1')).toHaveLength(1)
    expect(main.querySelector('form,table,details,img')).toBeNull()
  })
  it('renders a valid CMS edit instead of falling back to the checked-in initial copy', () => {
    const edited=structuredClone(contract)
    edited.modules[1]!.paragraphs[0]='A scoped editorial revision supplied by WordPress.'
    render(<MalaysiaPolandMarketPage marketPage={toMalaysiaPolandMarketPageDto(source(edited))}/> )
    expect(screen.getByText('A scoped editorial revision supplied by WordPress.')).not.toBeNull()
  })
  it.each([' ', '\u00a0', '\ufeff'])('rejects boundary whitespace consistently with WordPress (%j)', whitespace => {
    for(const value of [whitespace+'Editorial text','Editorial text'+whitespace,whitespace]) {
      const edited=structuredClone(contract);edited.modules[0]!.heading=value
      expect(()=>toMalaysiaPolandMarketPageDto(source(edited))).toThrow()
    }
  })
  it.each(['tio2-a','tio2-b',''])('rejects foreign or absent scope %s', scope => {
    expect(()=>toMalaysiaPolandMarketPageDto({...source(),siteScopes:{nodes:scope?[{slug:scope}]:[]}})).toThrow()
  })
  it.each(['draft','private','future'])('rejects nonpublished status %s', status => {
    expect(()=>toMalaysiaPolandMarketPageDto({...source(),status})).toThrow()
  })
  it('rejects ambiguous scopes, wrong path, invalid date and missing payload', () => {
    for (const patch of [
      {siteScopes:{nodes:[{slug:'tio2-my'},{slug:'tio2-a'}]}},
      {publishingFields:{publicPath:'/markets/united-kingdom'}},
      {modifiedGmt:'2026-02-31T01:02:03'}, {malaysiaPolandMarketContractJson:'null'},
    ]) expect(()=>toMalaysiaPolandMarketPageDto({...source(),...patch})).toThrow()
  })
  it('rejects missing qualification, reordered modules, foreign action, markup and hidden payload fields', () => {
    const variants = [
      (p:typeof contract)=>{p.modules[3]!.paragraphs.pop()},
      (p:typeof contract)=>{p.modules.reverse()},
      (p:typeof contract)=>{p.modules[0]!.actions[0]!.href='https://evil.example/'},
      (p:typeof contract)=>{p.modules[0]!.heading='<script>alert(1)</script>'},
      (p:typeof contract)=>Object.assign(p,{internalApproval:'secret'}),
      (p:typeof contract)=>{p.seo.canonical='https://tio2products.com/markets/poland/'},
    ]
    for (const mutate of variants) {const p=structuredClone(contract);mutate(p);expect(()=>toMalaysiaPolandMarketPageDto(source(p))).toThrow()}
  })
})
describe('Poland identity, metadata and cache boundaries', () => {
  it('keeps exact canonical, noindex and only the two approved graph types with shared entity IDs', () => {
    const page=toMalaysiaPolandMarketPageDto(source()),site=getSiteConfig('tio2-my')
    const meta=buildMalaysiaPolandMarketMetadata(site,page)
    expect(meta.title).toBe('Titanium Dioxide Supplier for Poland | TiO2 Malaysia')
    expect(meta.alternates?.canonical).toBe('https://tio2malaysia.com/markets/poland/')
    expect(meta.robots).toEqual({index:false,follow:false})
    const graph=buildMalaysiaPolandMarketJsonLd(site,page)['@graph'] as Record<string,unknown>[]
    expect(graph.map(x=>x['@type'])).toEqual(['WebPage','BreadcrumbList'])
    expect(graph[0]).toMatchObject({inLanguage:'en',isPartOf:{'@id':'https://tio2malaysia.com/#website'},publisher:{'@id':'https://tio2malaysia.com/#organization'}})
    expect((graph[1]!.itemListElement as unknown[])).toHaveLength(4)
    expect(()=>buildMalaysiaPolandMarketMetadata(getSiteConfig('tio2-a'),page)).toThrow()
  })
  it('uses the Poland canonical slash and preserves query without redirecting other sites to a Poland page', () => {
    vi.stubEnv('SITE_ID','tio2-my')
    const response=proxy(new NextRequest('http://localhost:3015/markets/poland?utm_source=test'))
    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('http://localhost:3015/markets/poland/?utm_source=test')
    expect(proxy(new NextRequest('http://localhost:3015/markets/poland/')).headers.get('location')).toBeNull()
    vi.stubEnv('SITE_ID','tio2-a')
    expect(proxy(new NextRequest('http://localhost:3015/markets/poland')).headers.get('location')).toBeNull()
  })
  it('creates a Poland-only content cache key and rejects wrong site and language', () => {
    expect(marketPageContentTag('tio2-my','MARKET-EU-PL','en')).toBe('content:tio2-my--market--MARKET-EU-PL--en')
    expect(()=>marketPageContentTag('tio2-a','MARKET-EU-PL','en')).toThrow()
    expect(()=>marketPageContentTag('tio2-my','MARKET-EU-PL','pl')).toThrow()
  })
})
