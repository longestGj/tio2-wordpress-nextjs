import {describe, expect, it, vi} from 'vitest'

import {submitMalaysiaSampleRequest} from '@/lib/request-sample/malaysia-request-sample-receiver'

const values = {grade_id:'M-2196',application_id:'coatings',application_other:'',test_objective:'Evaluate dispersion.',current_grade_or_target:'',contact_name:'Amina Tan',company_organisation:'Example Co',business_email:'amina@example.com',destination_country_market:'Malaysia',expected_project_annual_use:'',documents_needed:['tds'],additional_context:''}
const options = {accessKey:'shared-web3forms-key',idempotencyKey:'72a190ef-315a-4a5a-91be-0329d316eb39',sourceContext:{source_page_id:'PRODUCT-000'}}

describe('Malaysia Sample Request receiver', () => {
  it('is unavailable without the shared Web3Forms access key', async () => {
    await expect(submitMalaysiaSampleRequest(values, {...options, accessKey:null})).resolves.toEqual({kind:'unavailable'})
    await expect(submitMalaysiaSampleRequest(values, {...options, accessKey:' '})).resolves.toEqual({kind:'unavailable'})
  })

  it('posts to Web3Forms with the shared key and trusted Malaysia metadata', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({success:true}), {status:200,headers:{'content-type':'application/json'}}))
    await expect(submitMalaysiaSampleRequest(values, {...options, fetcher})).resolves.toEqual({kind:'receipt_confirmed'})
    const calls=fetcher.mock.calls as unknown as Array<[RequestInfo|URL,RequestInit]>
    expect(String(calls[0]?.[0])).toBe('https://api.web3forms.com/submit')
    const body = JSON.parse(String(calls[0]?.[1].body)) as Record<string, unknown>
    expect(body).toMatchObject({access_key:options.accessKey,email:values.business_email,site_scope:'tio2-my',request_type:'sample_request',page_id:'CONV-SAMPLE',form_version:'request-sample-v0.1-malaysia',privacy_notice_version:'CONV-SAMPLE-G7-HANDOFF-01',idempotency_key:options.idempotencyKey})
    expect(calls[0]?.[1].headers).not.toMatchObject({authorization:expect.anything()})
  })

  it('fails unconfirmed for provider ambiguity, non-JSON, 422 and transport errors', async () => {
    await expect(submitMalaysiaSampleRequest(values, {...options, fetcher:async () => new Response(JSON.stringify({success:false}), {status:200,headers:{'content-type':'application/json'}})})).resolves.toEqual({kind:'submission_unconfirmed'})
    await expect(submitMalaysiaSampleRequest(values, {...options, fetcher:async () => new Response('ok', {status:200,headers:{'content-type':'text/plain'}})})).resolves.toEqual({kind:'submission_unconfirmed'})
    await expect(submitMalaysiaSampleRequest(values, {...options, fetcher:async () => new Response('{}', {status:422})})).resolves.toEqual({kind:'submission_unconfirmed'})
    await expect(submitMalaysiaSampleRequest(values, {...options, fetcher:async () => {throw new Error('network')}})).resolves.toEqual({kind:'submission_unconfirmed'})
  })
})
