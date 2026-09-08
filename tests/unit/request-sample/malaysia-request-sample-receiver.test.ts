import {describe, expect, it, vi} from 'vitest'
import {submitMalaysiaSampleRequest} from '@/lib/request-sample/malaysia-request-sample-receiver'
const values = {grade_id:'M-2196',application_id:'coatings',application_other:'',test_objective:'Evaluate dispersion.',current_grade_or_target:'',contact_name:'Amina Tan',company_organisation:'Example Co',business_email:'amina@example.com',destination_country_market:'Malaysia',expected_project_annual_use:'',documents_needed:['tds'],additional_context:''}
const options = {idempotencyKey:'72a190ef-315a-4a5a-91be-0329d316eb39',sourceContext:{source_page_id:'PRODUCT-000'}}


describe('Sample same-origin receiver client',()=>{
 it('sends only values/context/idempotency to the local receiver and requires both acknowledgement flags',async()=>{
  const fetcher=vi.fn(async()=>Response.json({ok:true,receipt_confirmed:true}))
  expect(await submitMalaysiaSampleRequest(values,{...options,fetcher})).toEqual({kind:'receipt_confirmed'})
  const [url,init]=(fetcher.mock.calls as unknown as [string,RequestInit][])[0]
  expect(url).toBe('/api/sample/submit')
  expect(init.credentials).toBe('same-origin')
  expect(JSON.parse(String(init.body))).toEqual({values,idempotencyKey:options.idempotencyKey,sourceContext:options.sourceContext})
  expect(String(init.body)).not.toMatch(/access_key|recipient|receipt_confirmed|environment/)
 })
 it.each([{success:true},{ok:true},{receipt_confirmed:true},{ok:false,receipt_confirmed:true}])('rejects incomplete or provider-only acknowledgement %j',async(body)=>{
  expect(await submitMalaysiaSampleRequest(values,{...options,fetcher:async()=>Response.json(body)})).toEqual({kind:'submission_unconfirmed'})
 })
 it('keeps submission fields retryable if server configuration becomes unavailable',async()=>{
  expect(await submitMalaysiaSampleRequest(values,{...options,fetcher:async()=>Response.json({ok:false,receipt_confirmed:false,unavailable:true},{status:503})})).toEqual({kind:'submission_unconfirmed'})
 })
})

it('retains a retryable result for transient server storage failures',async()=>{
 expect(await submitMalaysiaSampleRequest(values,{...options,fetcher:async()=>Response.json({ok:false,receipt_confirmed:false},{status:503})})).toEqual({kind:'submission_unconfirmed'})
})
