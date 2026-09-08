import {execFileSync,spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {describe,it,expect} from 'vitest'
import {getEditorialContract,EDITORIAL_CONTRACTS,editorialTag} from '@/lib/editorial/malaysia-editorial-contracts'
import {assertEditorialReview} from '@/lib/editorial/editorial-review'
import {toMalaysiaEditorialDto} from '@/lib/wordpress/editorial-v01-dto'
import {buildEditorialJsonLd,buildEditorialMetadata} from '@/lib/seo/editorial-metadata'
import {getSiteConfig} from '@/sites'
import {resolveMalaysiaRequestDocumentsPrefill,normalizeMalaysiaRequestDocumentsSourcePageId} from '@/lib/request-documents/malaysia-request-documents-prefill'
import {submitMalaysiaRequestDocuments} from '@/lib/request-documents/malaysia-request-documents-receiver'
import {emptyMalaysiaRequestDocumentsValues} from '@/lib/request-documents/malaysia-request-documents-validation'
import alternatives from '@/wordpress/plugins/tio2-site-model/config/tio2-my-alternatives-review-evidence.json'
import trade from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-review-evidence.json'

const now=new Date('2026-09-09T12:00:00Z')
const oldIds=['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR','APP-COAT','APP-PLAS','APP-MB','APP-INK','APP-PAPER']
function envelope(id:string,unavailableInternalPaths:string[]=[]){
 const page=getEditorialContract(id)
 return {id:'editorial-review-1',modifiedGmt:'2026-09-08T01:00:00',status:'publish',recordPageId:id,siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:page.identity.path.slice(0,-1)},editorialContractJson:JSON.stringify(page),availableGradePaths:[],unavailableInternalPaths}
}

describe('independent five-page common-core review',()=>{
 it('keeps all nine prior contracts stable after the approved foundation corrections',()=>{
  expect(EDITORIAL_CONTRACTS).toHaveLength(14)
  for(const id of oldIds){
   const path=`wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${id.toLowerCase()}.json`
   const prior=JSON.parse(execFileSync('git',['show',`84db14e:${path}`],{encoding:'utf8'}))
   const page=getEditorialContract(id)
   if(id==='RES-TRADE-UK'){
    prior.source.renderedBodySha256='7c7c5a662a086613eb4be080e9a0645efd0c0a8dd60c92ad1db76ab0b1087a0e'
    prior.bodyHtml=prior.bodyHtml.replace('https://www.gov.uk/guidance/trade-remedies','https://www.gov.uk/guidance/check-when-you-need-to-pay-anti-dumping-countervailing-and-safeguard-duties')
   }
   if(id==='APP-COAT') prior.identity.provisional=true
   expect(page).toEqual(prior)
   const schema=buildEditorialJsonLd(getSiteConfig('tio2-my'),page)
   const metadata=buildEditorialMetadata(getSiteConfig('tio2-my'),page)
   if(page.identity.provisional){
    expect(schema).toBeNull()
    expect(metadata.alternates?.canonical).toBeUndefined()
   }else{
    expect((schema!['@graph'] as Array<Record<string,unknown>>).map(node=>node['@type'])).toEqual(['WebPage','BreadcrumbList'])
    expect(metadata.alternates?.canonical).toBe(prior.seo.canonical)
   }
  }
 })
 it('pins historical and current seed authorization to separate immutable page sets',()=>{
  for(const [name,ids,task] of [
   ['apply-tio2-my-editorial.php',oldIds,'G8-TRADE4-APP5-20260908-01'],
   ['apply-tio2-my-editorial-five.php',['MARKET-EU-DE','MARKET-EU-IT','PRODUCT-PROC-SU','RES-R706','RES-CHEMOURS'],'G8-DE-IT-SU-R706-CHEMOURS-20260908-01'],
  ] as const){
   const source=readFileSync(`wordpress/seed/${name}`,'utf8')
   const match=source.match(/foreach\(\[([^\]]+)\] as \$page_id\)/u)
   expect(match,`${name} must not inherit the expandable runtime registry`).not.toBeNull()
   expect([...match![1].matchAll(/'([^']+)'/gu)].map(item=>item[1])).toEqual(ids)
   expect(source).toContain(`get_option('tio2_editorial_task_id')!=='${task}'`)
  }
 })
 it('binds the separate alternatives evidence artifact to its unchanged local bytes',()=>{
  expect(createHash('sha256').update(readFileSync(alternatives.evidenceArtifact.path)).digest('hex')).toBe(alternatives.evidenceArtifact.sha256)
  expect(alternatives.pages.map(page=>page.pageId)).toEqual(['RES-R706','RES-CHEMOURS'])
  expect(trade.pages.map(page=>page.pageId)).toEqual(['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR'])
 })
 it.each(alternatives.pages)('trusts only the exact new review, including midnight expiry: $pageId',entry=>{
  const page=getEditorialContract(entry.pageId),review=entry.currentReview
  expect(()=>assertEditorialReview(page,review,now)).not.toThrow()
  expect(()=>assertEditorialReview(page,review,new Date('2026-12-05T15:59:59Z'))).not.toThrow()
  expect(()=>assertEditorialReview(page,review,new Date('2026-12-05T16:00:00Z'))).toThrow()
  for(const mutation of [{packageSha256:'0'.repeat(64)},{evidenceArtifactSha256:'0'.repeat(64)},{status:'unverified'},{eventStatus:'event_pending'},{evidenceDate:'2026-09-10'},{nextReviewDue:'2026-12-06'},{unexpected:true}]){
   expect(()=>assertEditorialReview(page,{...review,...mutation},now)).toThrow()
  }
  expect(()=>assertEditorialReview(page,trade.pages[0].currentReview,now)).toThrow()
  expect(()=>assertEditorialReview({...page,source:{...page.source,packageSha256:'0'.repeat(64)}},review,now)).toThrow()
 })
 it.each(['MARKET-EU-DE','MARKET-EU-IT'])('only omits complete approved conditional nodes for %s',id=>{
  const page=getEditorialContract(id),tradePath='/resources/eu-titanium-dioxide-anti-dumping-duty/'
  const dto=toMalaysiaEditorialDto(page,envelope(id,[tradePath]))
  expect(dto.bodyHtml).not.toContain('EU Titanium Dioxide Trade Update')
  expect(dto.bodyHtml).toContain('EU Procurement Overview')
  expect(dto.bodyHtml).toContain('general customs review.')
  expect(()=>toMalaysiaEditorialDto(page,envelope(id,['/products/']))).toThrow('unapproved conditional omission')
  expect(()=>toMalaysiaEditorialDto(page,envelope(id,['/markets/european-union/']))).toThrow('unapproved conditional omission')
 })
 it.each(['RES-R706','RES-CHEMOURS'])('does not turn required owner unavailability into content suppression for %s',id=>{
  const page=getEditorialContract(id)
  expect(()=>toMalaysiaEditorialDto(page,envelope(id,['/products/']))).toThrow('suppression policy')
  expect(()=>buildEditorialMetadata(getSiteConfig('tio2-a'),page)).toThrow('scope')
  expect((buildEditorialJsonLd(getSiteConfig('tio2-my'),page)!['@graph'] as Record<string,unknown>[]).map(node=>node['@type'])).toEqual([id==='RES-CHEMOURS'?'TechArticle':'WebPage','BreadcrumbList'])
  expect(buildEditorialMetadata(getSiteConfig('tio2-my'),page).alternates?.canonical).toBe('https://tio2malaysia.com'+page.identity.path)
  expect(()=>editorialTag('tio2-b',id)).toThrow()
 })
 it.each(['PRODUCT-PROC-SU','MARKET-EU-DE','MARKET-EU-IT'])('keeps source-only Documents entry neutral even with extra URL context: %s',id=>{
  for(const source of [{source_page_id:id},{source_page:id}]){
   expect(resolveMalaysiaRequestDocumentsPrefill({...source,product_grade:'M-996',application_industry:'Coatings',document_types:['safety','regulatory'],additional_requirements:'Injected prefill',country_region:'Germany',market_id:'MARKET-EU-DE'})).toEqual({values:{},sourcePageId:id,marketId:null,prefillVisible:false})
  }
 })
 it.each(['PRODUCT-PROC-SU','MARKET-EU-DE','MARKET-EU-IT'])('retains internal source-only attribution when buyer supplies required document fields: %s',async id=>{
  const prefill=resolveMalaysiaRequestDocumentsPrefill({source_page_id:id})
  expect(prefill.values).toEqual({})
  const values={...emptyMalaysiaRequestDocumentsValues,full_name:'Audit Buyer',company:'Example',business_email:'audit@example.invalid',country_region:'Malaysia',product_grade:'M-996',document_types:['safety'],application_industry:id==='PRODUCT-PROC-SU'?'':'Custom buyer coating system'}
  let transmitted:Record<string,unknown>|undefined
  await submitMalaysiaRequestDocuments(values,{accessKey:'mock-only',requestToken:'review-only',marketId:null,sourcePageId:normalizeMalaysiaRequestDocumentsSourcePageId(prefill.sourcePageId,{productGrade:values.product_grade,applicationIndustry:values.application_industry}),fetcher:async(_url,init)=>{transmitted=JSON.parse(String(init?.body));return Response.json({success:true})}})
  expect(transmitted?.product_grade).toBe('M-996')
  expect(transmitted?.source_page_id).toBe(id)
 })
})

// Opt-in actual PHP parity probe, using only the task container's read-only plugin mount.
it.skipIf(!process.env.FIVE_REVIEW_PHP_CONTAINER)('PHP accepts the new trust manifest and rejects mutation/expiry without CMS mutation',()=>{
 const php=`<?php
define('ABSPATH','/var/www/html/');
$base='/var/www/html/wp-content/plugins/tio2-site-model';
require $base.'/includes/editorial-review.php';
$checks=[];
foreach(['RES-R706','RES-CHEMOURS','RES-TRADE-EU'] as $id){
 $manifest=tio2_editorial_review_manifest($id);
 $entries=array_values(array_filter($manifest['pages'],fn($p)=>$p['pageId']===$id));
 $review=$entries[0]['currentReview'];
 $payload=json_decode(file_get_contents($base.'/config/tio2-my-editorial-'.strtolower($id).'.json'),true);
 $checks[$id.'-valid']=tio2_editorial_review_valid_at($payload,$review,new DateTimeImmutable('2026-09-09T12:00:00Z'));
 foreach(['status'=>'unverified','eventStatus'=>'event_pending','packageSha256'=>str_repeat('0',64),'evidenceArtifactSha256'=>str_repeat('0',64),'nextReviewDue'=>'2027-01-01','unexpected'=>true] as $key=>$value){
  $changed=$review;$changed[$key]=$value;
  $checks[$id.'-'.$key]=!tio2_editorial_review_valid_at($payload,$changed,new DateTimeImmutable('2026-09-09T12:00:00Z'));
 }
 $checks[$id.'-expired']=!tio2_editorial_review_valid_at($payload,$review,new DateTimeImmutable('2026-12-05T16:00:00Z'));
}
echo json_encode($checks);exit(in_array(false,$checks,true)?1:0);`
 const result=spawnSync('docker',['exec','-i',process.env.FIVE_REVIEW_PHP_CONTAINER!,'php'],{input:php,encoding:'utf8',timeout:20000})
 expect(result.status,result.stdout+result.stderr).toBe(0)
 expect(Object.values(JSON.parse(result.stdout))).not.toContain(false)
})
