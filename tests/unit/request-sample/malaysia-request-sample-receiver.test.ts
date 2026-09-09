import {describe, expect, it, vi} from 'vitest'
import {submitMalaysiaSampleRequest} from '@/lib/request-sample/malaysia-request-sample-receiver'
const values = {grade_id:'M-2196',application_id:'coatings',application_other:'',test_objective:'Evaluate dispersion.',current_grade_or_target:'',contact_name:'Amina Tan',company_organisation:'Example Co',business_email:'amina@example.com',destination_country_market:'Malaysia',expected_project_annual_use:'',documents_needed:['tds'],additional_context:''}
const options = {accessKey:'01234567-89ab-cdef-0123-456789abcdef',requestToken:'sample-token',sourceContext:{source_page_id:'PRODUCT-000'}}


describe('Sample same-origin receiver client',()=>{
  it('does not trim malformed configuration into a usable key', async () => {
    const fetcher = vi.fn(async () => Response.json({success: true}))
    const result = await submitMalaysiaSampleRequest(values, {...options, accessKey: '01234567-89ab-cdef-0123-456789abcdef ', fetcher})
    expect(result.kind).toBe('unavailable')
    expect(fetcher).not.toHaveBeenCalled()
  })
 it('uses the shared browser transport and never the retained server endpoint',async()=>{
  const fetcher=vi.fn(async()=>Response.json({success:true}))
  const result=await submitMalaysiaSampleRequest(values,{...options,accessKey:'01234567-89ab-cdef-0123-456789abcdef',requestToken:'sample-token',fetcher})
  expect(result.kind).toBe('provider_accepted')
  expect(fetcher).toHaveBeenCalledTimes(1)
  const calls=fetcher.mock.calls as unknown as Array<[RequestInfo|URL,RequestInit]>
  expect(calls[0]?.[0]).toBe('https://api.web3forms.com/submit')
  expect(JSON.parse(String(calls[0]?.[1]?.body))).toMatchObject({site_scope:'tio2-my',page_id:'CONV-SAMPLE',workflow_type:'sample',locale:'en',request_token:'sample-token'})
 })
 it('maps approved values and source context to the provider payload',async()=>{
  const fetcher=vi.fn(async()=>Response.json({success:true}))
  expect(await submitMalaysiaSampleRequest(values,{...options,fetcher})).toMatchObject({kind:'provider_accepted'})
  const [url,init]=(fetcher.mock.calls as unknown as [string,RequestInit][])[0]
  expect(url).toBe('https://api.web3forms.com/submit')
  expect(JSON.parse(String(init.body))).toMatchObject({access_key:'01234567-89ab-cdef-0123-456789abcdef',site_scope:'tio2-my',page_id:'CONV-SAMPLE',workflow_type:'sample',locale:'en',request_token:'sample-token',source_page_id:'PRODUCT-000'})
  expect(String(init.body)).not.toMatch(/recipient|receiver_address/)
 })
 it.each([{ok:true},{legacy_confirmed:true},{ok:false,legacy_confirmed:true}])('rejects incomplete or legacy acknowledgement %j',async(body)=>{
  expect(await submitMalaysiaSampleRequest(values,{...options,fetcher:async()=>Response.json(body)})).toMatchObject({kind:expect.not.stringMatching('provider_accepted')})
 })
 it('keeps submission fields retryable if server configuration becomes unavailable',async()=>{
  expect(await submitMalaysiaSampleRequest(values,{...options,fetcher:async()=>Response.json({success:false},{status:503})})).toMatchObject({kind:'submission_unconfirmed'})
 })
})

it('retains a retryable result for transient server storage failures',async()=>{
 expect(await submitMalaysiaSampleRequest(values,{...options,fetcher:async()=>Response.json({success:false},{status:503})})).toMatchObject({kind:'submission_unconfirmed'})
})
