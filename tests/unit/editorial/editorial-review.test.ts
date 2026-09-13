import {describe,expect,it} from 'vitest'
import eu from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-eu.json'
import uk from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-uk.json'
import india from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-in.json'
import brazil from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-br.json'
import type {EditorialContract} from '@/lib/editorial/editorial-types'

const artifactSha='56974A5F9508A28512CB71D52F5E9BB7FC7210F7DD0A03D3544FAAD07721557C'
const checkedAt='2026-09-13T06:34:21+08:00'
const outcome='NO_MATERIAL_CHANGE_LOCATED_IN_BOUNDED_OFFICIAL_CHECK'
const pages=[eu,uk,india,brazil] as unknown as EditorialContract[]
const euPage=pages[0]

function review(page:EditorialContract){
 return {
  schemaVersion:'editorial-review-v0.1',pageId:page.identity.pageId,siteScope:'tio2-my',
  packageSha256:page.source.packageSha256,evidenceArtifactSha256:artifactSha,
  evidenceDate:'2026-09-13',checkedAt,timeZone:'Asia/Kuala_Lumpur',outcome,
  policyId:`${page.identity.pageId}-FRESHNESS-V0.1`,status:'verified',
  eventStatus:'no_open_trigger',nextReviewDue:'2026-10-13',
 }
}

async function validator(){return import('@/lib/editorial/editorial-review')}

describe('assertEditorialReview',()=>{
 it('accepts the exact trusted current review for every Trade page',async()=>{
  const {assertEditorialReview}=await validator()
  for(const page of pages) expect(()=>assertEditorialReview(page,review(page),new Date('2026-09-13T12:00:00Z'))).not.toThrow()
 })

 it('does not require review evidence for undated application pages',async()=>{
  const {assertEditorialReview}=await validator()
  const application={...euPage,freshness:null} as EditorialContract
  expect(()=>assertEditorialReview(application,null,new Date('2026-09-13T12:00:00Z'))).not.toThrow()
 })

 it.each([
  ['pageId','RES-TRADE-OTHER'],['siteScope','tio2-a'],['packageSha256','0'.repeat(64)],
  ['evidenceArtifactSha256','A'.repeat(64)],['evidenceDate','2026-09-07'],
  ['checkedAt','2026-09-13T06:34:22+08:00'],['timeZone','UTC'],['outcome','MATERIAL_CHANGE'],
  ['policyId','wrong-policy'],['nextReviewDue','2026-10-14'],
 ])('rejects an altered %s binding',async(key,value)=>{
  const {assertEditorialReview,EditorialReviewError}=await validator()
  expect(()=>assertEditorialReview(euPage,{...review(euPage),[key]:value},new Date('2026-09-13T12:00:00Z'))).toThrow(EditorialReviewError)
 })

 it.each(['unverified','withdrawn'])('fails closed for %s status',async status=>{
  const {assertEditorialReview,EditorialReviewError}=await validator()
  expect(()=>assertEditorialReview(euPage,{...review(euPage),status},new Date('2026-09-13T12:00:00Z'))).toThrow(EditorialReviewError)
 })

 it('fails closed while a freshness event is pending',async()=>{
  const {assertEditorialReview,EditorialReviewError}=await validator()
  expect(()=>assertEditorialReview(euPage,{...review(euPage),eventStatus:'event_pending'},new Date('2026-09-13T12:00:00Z'))).toThrow(EditorialReviewError)
 })

 it.each([
  ['invalid calendar date',{evidenceDate:'2026-02-31'}],
  ['old evidence',{evidenceDate:'2026-01-01'}],
  ['future evidence',{evidenceDate:'2026-09-14'}],
  ['future timestamp',{checkedAt:'2026-09-14T06:34:21+08:00'}],
 ])('rejects %s',async(_label,change)=>{
  const {assertEditorialReview,EditorialReviewError}=await validator()
  expect(()=>assertEditorialReview(euPage,{...review(euPage),...change},new Date('2026-09-13T12:00:00Z'))).toThrow(EditorialReviewError)
 })

 it('rejects unknown review keys',async()=>{
  const {assertEditorialReview,EditorialReviewError}=await validator()
  expect(()=>assertEditorialReview(euPage,{...review(euPage),unexpected:true},new Date('2026-09-13T12:00:00Z'))).toThrow(EditorialReviewError)
 })

 it('uses Kuala Lumpur calendar days at the approved due-date boundary',async()=>{
  const {assertEditorialReview,EditorialReviewError}=await validator()
  expect(()=>assertEditorialReview(euPage,review(euPage),new Date('2026-10-13T15:59:59Z'))).not.toThrow()
  expect(()=>assertEditorialReview(euPage,review(euPage),new Date('2026-10-13T16:00:00Z'))).toThrow(EditorialReviewError)
 })
})
