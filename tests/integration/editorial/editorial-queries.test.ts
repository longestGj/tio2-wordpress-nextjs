import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {getMalaysiaEditorialPage} from '@/lib/wordpress/editorial-v01-queries'
import {EDITORIAL_CONTRACTS,getEditorialContract,editorialTag} from '@/lib/editorial/malaysia-editorial-contracts'
import {buildEditorialMetadata,buildEditorialJsonLd} from '@/lib/seo/editorial-metadata'
import {getSiteConfig} from '@/sites'
import evidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-review-evidence.json'

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
beforeEach(()=>vi.stubEnv('WORDPRESS_EDITORIAL_API_TOKEN','local-test-token'))
function envelope(pageId:string) {
 const page=getEditorialContract(pageId)
 return {id:'editorial-123',modifiedGmt:'2026-09-08T00:00:00',status:'publish',recordPageId:pageId,siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:page.identity.path.slice(0,-1)},editorialContractJson:JSON.stringify(page),freshnessControl:evidence.pages.find(p=>p.pageId===pageId)?.currentReview??null,availableGradePaths:[...new Set([...page.bodyHtml.matchAll(/href="(\/products\/m-[0-9]+\/)"/gu)].map(match=>match[1]))],unavailableInternalPaths:[]}
}
describe('live-shaped editorial GraphQL delivery',()=>{
 it('omits unavailable breadcrumb destinations from machine navigation and reindexes retained items',()=>{
  const page={...getEditorialContract('APP-INK'),unavailableInternalPaths:['/applications/']}
  const graph=buildEditorialJsonLd(getSiteConfig('tio2-my'),page)['@graph'] as Array<Record<string,unknown>>
  const crumbs=graph[1].itemListElement as Array<{position:number;item:string}>
  expect(crumbs.map(crumb=>crumb.item)).not.toContain('https://tio2malaysia.com/applications/')
  expect(crumbs.map(crumb=>crumb.position)).toEqual([1,2])
  expect(page.bodyHtml).toContain('Applications')
 })
 it.each(EDITORIAL_CONTRACTS.map(page=>({id:page.identity.pageId})))('sends explicit scope and distinct cache identity for $id',async({id})=>{
  const fetch=vi.fn(async()=>Response.json({data:{malaysiaEditorialRecordJson:JSON.stringify(envelope(id))}}));vi.stubGlobal('fetch',fetch)
  const result=await getMalaysiaEditorialPage(id,'tio2-my')
  expect(result.identity.pageId).toBe(id)
  const request=fetch.mock.calls[0] as unknown as [string,RequestInit & {next:{tags:string[]}}]
  expect(JSON.parse(String(request[1].body)).variables).toEqual({pageId:id,siteScope:'tio2-my'})
  expect(request[1].next.tags).toContain(editorialTag('tio2-my',id))
  expect(request[1].cache).toBe('no-store')
  expect(result.unavailableInternalPaths).toEqual([])
  expect(request[1].next.tags.every(t=>!t.includes('tio2-a')&&!t.includes('tio2-b'))).toBe(true)
 })
 it('rejects a foreign request before any network call',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch)
  await expect(getMalaysiaEditorialPage('APP-COAT','tio2-a')).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
 })
 it.each(['missing','foreign','changed','draft'])('fails closed for %s CMS response',async(mode)=>{
  const record=envelope('APP-COAT')
  if(mode==='foreign') record.siteScopes.nodes=[{slug:'tio2-b'}]
  if(mode==='changed') record.editorialContractJson='{}'
  if(mode==='draft') record.status='draft'
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json(mode==='missing'?{errors:[{message:'missing'}]}:{data:{malaysiaEditorialRecordJson:JSON.stringify(record)}})))
  await expect(getMalaysiaEditorialPage('APP-COAT','tio2-my')).rejects.toThrow()
 })
 it.each(EDITORIAL_CONTRACTS.map(page=>({page,id:page.identity.pageId})))('binds exact SEO, noindex and permitted Schema for $id',({page})=>{
  const metadata=buildEditorialMetadata(getSiteConfig('tio2-my'),page)
  expect(metadata.title).toEqual({absolute:page.seo.title})
  expect(metadata.alternates?.canonical).toBe(page.seo.canonical)
  expect(metadata.robots).toEqual({index:false,follow:false})
  const graph=buildEditorialJsonLd(getSiteConfig('tio2-my'),page)['@graph'] as Array<Record<string,unknown>>
  expect(graph.map(n=>n['@type'])).toEqual(['WebPage','BreadcrumbList'])
  expect(()=>buildEditorialMetadata(getSiteConfig('tio2-a'),page)).toThrow()
 })
})
