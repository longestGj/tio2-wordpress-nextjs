import {readFileSync,readdirSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {matchesInstalledContent} from '@/lib/wordpress/content-release-validation'
import policies from '@/wordpress/plugins/tio2-site-model/includes/content-release-paths.json'
import * as products from '../fixtures/tio2-my-product-detail'
import {toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {toMalaysiaEditorialDto} from '@/lib/wordpress/editorial-v01-dto'
import {toMalaysiaLegalPagesDto} from '@/lib/wordpress/legal-pages-v01-dto'
import {toMalaysiaCountryMarketPageDto} from '@/lib/wordpress/market-country-v01-dto'
import {projectMalaysiaResourceOriginPayload,toMalaysiaResourceOriginDto} from '@/lib/wordpress/resource-origin-v01-dto'
import {projectMalaysiaResourceProcPayload,toMalaysiaResourceProcDto} from '@/lib/wordpress/resource-proc-v01-dto'
import type {EditorialContract} from '@/lib/editorial/editorial-types'
const read=(name:string)=>JSON.parse(readFileSync(`wordpress/plugins/tio2-site-model/config/tio2-my-${name}.json`,'utf8'))
const modules=import.meta.glob('../../lib/wordpress/*dto.ts',{eager:true}) as Record<string,Record<string,(...args:never[])=>unknown>>
const base=(path:string)=>({id:'cms-release-1',modifiedGmt:'2026-09-03T10:00:00',status:'publish',siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:path.replace(/\/$/u,'')}})
const mutate=(value:unknown,path:string,text:string)=>{const copy=structuredClone(value) as Record<string,unknown>;let node:unknown=copy;const keys=path.split('.');for(const key of keys.slice(0,-1))node=(node as Record<string,unknown>)[key];(node as Record<string,unknown>)[keys.at(-1)!]=text;return copy}
const installed=readdirSync('wordpress/plugins/tio2-site-model/config').filter(name=>name.startsWith('tio2-my-')&&name.endsWith('.json')&&!name.includes('evidence')).flatMap(name=>{const c=JSON.parse(readFileSync(`wordpress/plugins/tio2-site-model/config/${name}`,'utf8'));return c.pages??[c]}).filter(c=>(c.identity?.pageId??c.page?.page_id??c.pageId) in policies)
describe('explicit installed CMS text policy',()=>{
 it.each(installed.map(c=>[c.identity?.pageId??c.page?.page_id??c.pageId,c]))('%s accepts every declared text path and rejects forbidden mutations',(id,c)=>{
  for(const path of (policies as Record<string,string[]>)[id]){
   if(path==='bodyHtml'||path==='buyerVisibleMarkdown')continue
   expect(matchesInstalledContent(mutate(c,path,'Updated buyer guidance.'),c),`${id}:${path}`).toBe(true)
   expect(matchesInstalledContent(mutate(c,path,'<script>alert(1)</script>'),c)).toBe(false)
  }
  expect(matchesInstalledContent({...c,privateEvidence:'internal-only'},c)).toBe(false)
  expect(matchesInstalledContent({...c,identity:{...c.identity,siteScope:'tio2-a'}},c)).toBe(false)
 })
})
const direct=[
 ['homepage','homepage-v04','malaysiaHomepageContractJson','hero.body'],
 ['about-page','about-page-v01','malaysiaAboutPageContractJson','hero.h1'],
 ['application-hub','application-hub-v01','malaysiaApplicationHubContractJson','hero.intro'],
 ['contact-page','contact-page-v01','malaysiaContactPageContractJson','hero.lead'],
 ['documents-hub','documents-hub-v01','malaysiaDocumentsHubContractJson','hero.body'],
 ['document-coo','document-coo-v04','malaysiaDocumentCooContractJson','seo.description'],
 ['document-reach','document-reach-v01','malaysiaDocumentReachContractJson','seo.meta_description'],
 ['document-tds','document-tds-v01','malaysiaDocumentTdsContractJson','seo.meta_description'],
 ['market-hub','market-hub-v01','malaysiaMarketHubContractJson','hero.body'],
 ['market-eu-001','market-page-v01','malaysiaEuMarketContractJson','hero.body'],
 ['market-uk-001','market-page-uk-v01','malaysiaUkMarketContractJson','hero.body'],
 ['market-poland','market-page-poland-v01','malaysiaPolandMarketContractJson','modules.0.paragraphs.0'],
 ['market-brazil-en','market-page-brazil-en-v01','malaysiaBrazilEnMarketContractJson','modules.0.paragraphs.0'],
 ['market-brazil-pt','market-page-brazil-pt-v02','malaysiaBrazilPtMarketContractJson','modules.0.paragraphs.0'],
 ['product-hub','product-hub-v01','malaysiaProductHubContractJson','hero.intro'],
 ['product-process-chloride','product-process-chloride-v01','malaysiaChlorideProcessContractJson','modules.0.paragraphs.0'],
 ['request-documents','request-documents-v01','malaysiaRequestDocumentsContractJson','hero.body'],
 ['request-sample','request-sample-v01','malaysiaRequestSampleContractJson','hero.body'],
 ['rfq-page','rfq-page-v01','malaysiaRfqPageContractJson','hero.body'],
 ['resource-hub','resource-hub-v01','malaysiaResourceHubContractJson','hero.body'],
]
describe('real DTO content delivery without recompilation',()=>{
 it.each(direct)('%s renders CMS text and rejects an unsafe text edit',(config,module,field,path)=>{
  const c=read(config), changed=mutate(c,path,'Updated buyer guidance.')
  const source:Record<string,unknown>={...base(c.identity?.path??c.page.route),[field]:JSON.stringify(changed)}
  if(module==='homepage-v04')source.homepageFields={homepageSchemaVersion:'homepage-v0.4-malaysia'}
  if(module==='about-page-v01')source.malaysiaAboutPageEvidenceJson=JSON.stringify(read('about-evidence'))
  if(c.routeRegistry)source.routeReadiness=Object.fromEntries(c.routeRegistry.map((r:{targetPageId:string})=>[r.targetPageId,true]))
  if(module==='document-tds-v01')source.routeReadiness=Object.fromEntries(['CONV-DOC','DOC-000','DOC-REACH','DOC-COO'].map(k=>[k,true]))
  if(module==='document-reach-v01'){source.routeReadiness=Object.fromEntries(['CONV-DOC','DOC-000','MARKET-EU-001'].map(k=>[k,true]));source.sourceReadiness=Object.fromEntries(c.modules[6].items.map((x:{url:string})=>[x.url,true]))}
  if(module==='resource-hub-v01')source.resourceProjection={publicState:'H0_NO_QUALIFIED_RESOURCE',resourceGroups:[]}
  const exports=modules[`../../lib/wordpress/${module}-dto.ts`];const fn=Object.entries(exports).find(([key])=>key.startsWith('toMalaysia'))![1] as (x:unknown)=>unknown
  expect(JSON.stringify(fn(source))).toContain('Updated buyer guidance.')
  expect(()=>fn({...source,[field]:JSON.stringify(mutate(c,path,'<script>alert(1)</script>'))})).toThrow()
 })
 it.each(Object.entries(products).filter(([key])=>key.endsWith('Source')))('%s renders projected CMS product text',(name,fixture)=>{
  const source=structuredClone((fixture as ()=>import('@/lib/wordpress/product-detail-v01-dto').MalaysiaProductDetailSource)());const projection=source.publicProjection as Record<string,unknown>
  const modules=projection.modules as Record<string,Record<string,unknown>>;modules.hero.summaryBody='Updated buyer guidance.'
  expect(JSON.stringify(toMalaysiaProductDetailDto(source))).toContain('Updated buyer guidance.')
 })
 it.each(installed.filter(c=>c.bodyHtml))('$identity.pageId renders CMS editorial paragraph and preserves HTML destinations',c=>{
  const changed={...c,bodyHtml:c.bodyHtml.replace(/(<p[^>]*>)([^<]+)/u,'$1Updated buyer guidance. $2')}
  const source={...base(c.identity.path),recordPageId:c.identity.pageId,editorialContractJson:JSON.stringify(changed),availableGradePaths:[],unavailableInternalPaths:[]}
  expect(toMalaysiaEditorialDto(c as EditorialContract,source).bodyHtml).toContain('Updated buyer guidance.')
  expect(()=>toMalaysiaEditorialDto(c as EditorialContract,{...source,editorialContractJson:JSON.stringify({...changed,bodyHtml:changed.bodyHtml.replace('href="','href="javascript:')})})).toThrow()
 })
 it.each(['market-eu-be','market-eu-es','market-eu-nl','market-in-001'])('%s delivers country-market CMS paragraph',name=>{
  const c=read(name),changed=mutate(c,'modules.0.paragraphs.0.runs.0.text','Updated buyer guidance.')
  expect(JSON.stringify(toMalaysiaCountryMarketPageDto(c.identity.pageId,{...base(c.identity.path),recordPageId:c.identity.pageId,malaysiaCountryMarketContractJson:JSON.stringify(changed)}))).toContain('Updated buyer guidance.')
 })
 it.each(['origin','proc'])('resource %s preserves changed public projection',kind=>{
  const c=read(`resource-${kind}`),changed=mutate(c,'hero.supportingCopy','Updated buyer guidance.')
  const source={...base(c.identity.path),publishingFields:{publicPath:c.identity.path}}
  const dto=kind==='origin'?toMalaysiaResourceOriginDto({...source,resourceOriginPayload:projectMalaysiaResourceOriginPayload(changed)}):toMalaysiaResourceProcDto({...source,resourceProcPayload:projectMalaysiaResourceProcPayload(changed)})
  expect(JSON.stringify(dto)).toContain('Updated buyer guidance.')
 })
 it('renders legal Markdown edits while keeping link and section structure',()=>{
  const c=read('legal-pages');const records=c.pages.map((p:Record<string,string>)=>({...base(p.path),malaysiaLegalPageContractJson:JSON.stringify({...p,buyerVisibleMarkdown:p.buyerVisibleMarkdown.replace(/(\n## [^\n]+\n\n)/u,'$1Updated buyer guidance. ')})}))
  expect(JSON.stringify(toMalaysiaLegalPagesDto(records))).toContain('Updated buyer guidance.')
 })
})
