import {describe,it,expect} from 'vitest'
import {buildEditorialMetadata,buildEditorialJsonLd} from '@/lib/seo/editorial-metadata'
import {getEditorialContract} from '@/lib/editorial/malaysia-editorial-contracts'
import {toMalaysiaEditorialDto} from '@/lib/wordpress/editorial-v01-dto'
import {resolveMalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import {resolveMalaysiaRequestDocumentsPrefill} from '@/lib/request-documents/malaysia-request-documents-prefill'
import {resolveMalaysiaSamplePrefill} from '@/lib/request-sample/malaysia-request-sample-prefill'
import {getSiteConfig as getSite} from '@/sites'

describe('five approved page delivery policies',()=>{
 it.each(['MARKET-EU-DE','MARKET-EU-IT','PRODUCT-PROC-SU'])('accepts source-only receiver attribution for %s',source_page_id=>{
  expect(resolveMalaysiaRfqPrefill({source_page_id})).toMatchObject({sourcePageId:source_page_id,values:{}})
  expect(resolveMalaysiaRequestDocumentsPrefill({source_page_id})).toMatchObject({sourcePageId:source_page_id,values:{},prefillVisible:false})
 })
 it('Italy sample stays source-only despite injected market, grade and destination',()=>{
  expect(resolveMalaysiaSamplePrefill({source_page_id:'MARKET-EU-IT',market_id:'MARKET-EU-IT',destination:'Italy',grade_id:'M-996',application_id:'coatings',resource_context:'RES-ORIGIN'})).toEqual({source_page_id:'MARKET-EU-IT'})
 })
 it.each(['RES-R706','RES-CHEMOURS'])('emits approved candidate canonical and exact schema for %s',id=>{
  const page=getEditorialContract(id),site=getSite('tio2-my')
  expect(buildEditorialMetadata(site,page).alternates?.canonical).toBe('https://tio2malaysia.com'+page.identity.path)
  expect((buildEditorialJsonLd(site,page)!['@graph'] as Record<string,unknown>[]).map(node=>node['@type'])).toEqual([id==='RES-CHEMOURS'?'TechArticle':'WebPage','BreadcrumbList'])
 })
 it('Sulfate retains visible five Grade actions when readiness is empty',()=>{
  const page=getEditorialContract('PRODUCT-PROC-SU')
  const dto=toMalaysiaEditorialDto(page,{id:'local-5',modifiedGmt:'2026-09-08T00:00:00',status:'publish',recordPageId:page.identity.pageId,siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:page.identity.path.slice(0,-1)},editorialContractJson:JSON.stringify(page),availableGradePaths:[],unavailableInternalPaths:[]})
  for(const slug of ['m-996','m-2196','m-108','m-52','m-2377'])expect(dto.bodyHtml).toContain(`href="/products/${slug}/"`)
  const schema=buildEditorialJsonLd(getSite('tio2-my'),page)
  expect(JSON.stringify(schema)).toContain('CollectionPage')
  expect(JSON.stringify(schema)).toContain('"numberOfItems":5')
 })
})
