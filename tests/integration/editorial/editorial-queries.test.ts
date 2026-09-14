import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {getMalaysiaEditorialPage} from '@/lib/wordpress/editorial-v01-queries'
import {EDITORIAL_CONTRACTS,getEditorialContract,editorialTag} from '@/lib/editorial/malaysia-editorial-contracts'
import {buildEditorialMetadata,buildEditorialJsonLd} from '@/lib/seo/editorial-metadata'
import {getSiteConfig} from '@/sites'
import evidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-review-evidence.json'
import alternativeEvidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-alternatives-review-evidence.json'

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
beforeEach(()=>vi.stubEnv('WORDPRESS_EDITORIAL_API_TOKEN','local-test-token'))
function envelope(pageId:string) {
 const page=getEditorialContract(pageId)
 return {id:'editorial-123',modifiedGmt:'2026-09-08T00:00:00',status:'publish',recordPageId:pageId,siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:page.identity.path.slice(0,-1)},editorialContractJson:JSON.stringify(page),freshnessControl:[...evidence.pages,...alternativeEvidence.pages].find(p=>p.pageId===pageId)?.currentReview??null,availableGradePaths:[...new Set([...page.bodyHtml.matchAll(/href="(\/products\/m-[0-9]+\/)"/gu)].map(match=>match[1]))],unavailableInternalPaths:[]}
}
describe('live-shaped editorial GraphQL delivery',()=>{
 it('omits unavailable breadcrumb destinations from final-route machine navigation and reindexes retained items',()=>{
  const page={...getEditorialContract('RES-TRADE-UK'),unavailableInternalPaths:['/resources/']}
  const graph=buildEditorialJsonLd(getSiteConfig('tio2-my'),page)!
  const crumbs=(graph['@graph'] as Array<Record<string,unknown>>)[1].itemListElement as Array<{position:number;item:string}>
  expect(crumbs.map(crumb=>crumb.item)).not.toContain('https://tio2malaysia.com/resources/')
  expect(crumbs.map(crumb=>crumb.position)).toEqual([1,2])
 })
 it('keeps every Application route provisional until its route owner approves a final URL',()=>{
  const applications=EDITORIAL_CONTRACTS.filter(page=>page.identity.section==='applications')
  expect(applications).toHaveLength(5)
  expect(applications.every(page=>page.identity.provisional)).toBe(true)
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
 it.each(EDITORIAL_CONTRACTS.filter(page=>!page.identity.provisional).map(page=>({page,id:page.identity.pageId})))('binds exact SEO, noindex and permitted Schema for final route $id',({page})=>{
  const metadata=buildEditorialMetadata(getSiteConfig('tio2-my'),page)
  expect(metadata.title).toEqual(page.seo.title)
  expect(metadata.alternates?.canonical).toBe(page.seo.canonical??undefined)
  expect(metadata.robots).toEqual({index:false,follow:false})
  const schema=buildEditorialJsonLd(getSiteConfig('tio2-my'),page)
  if(page.seo.schemaType==='none')expect(schema).toBeNull()
  else {
   const graph=schema!['@graph'] as Array<Record<string,unknown>>
   expect(graph.map(n=>n['@type'])).toEqual(page.identity.pageId==='PRODUCT-PROC-SU'?['CollectionPage','BreadcrumbList','ItemList']:page.identity.pageId==='RES-CHEMOURS'?['TechArticle','BreadcrumbList']:['WebPage','BreadcrumbList'])
  }
  expect(()=>buildEditorialMetadata(getSiteConfig('tio2-a'),page)).toThrow()
 })
 it.each(EDITORIAL_CONTRACTS.filter(page=>page.identity.section==='applications').map(page=>({page,id:page.identity.pageId})))('uses the approved public mapping for historically provisional route $id',({page})=>{
  const metadata=buildEditorialMetadata(getSiteConfig('tio2-my'),page)
  expect(metadata.title).toEqual(page.seo.title)
  expect(metadata.alternates?.canonical).toBe('https://tio2malaysia.com'+page.identity.path)
  expect(metadata.openGraph?.url).toBe('https://tio2malaysia.com'+page.identity.path)
  expect(metadata.robots).toEqual({index:false,follow:false})
  expect(buildEditorialJsonLd(getSiteConfig('tio2-my'),page)?.['@graph']).toEqual(expect.arrayContaining([expect.objectContaining({'@type':'WebPage',url:'https://tio2malaysia.com'+page.identity.path})]))
 })
 it('keeps the approved UK source label while using the maintained HMRC URL',()=>{
  const page=getEditorialContract('RES-TRADE-UK')
  expect(page.bodyHtml).toContain('>HMRC trade remedies guidance</a>')
  expect(page.bodyHtml).toContain('href="https://www.gov.uk/guidance/check-when-you-need-to-pay-anti-dumping-countervailing-and-safeguard-duties"')
  expect(page.bodyHtml).not.toContain('href="https://www.gov.uk/guidance/trade-remedies"')
 })
})
