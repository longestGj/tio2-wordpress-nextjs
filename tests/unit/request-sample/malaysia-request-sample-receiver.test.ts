import {describe, expect, it, vi} from 'vitest'

import {submitMalaysiaSampleRequest} from '@/lib/request-sample/malaysia-request-sample-receiver'

const values = {grade_id:'M-2196',application_id:'coatings',application_other:'',test_objective:'Evaluate dispersion.',current_grade_or_target:'',contact_name:'Amina Tan',company_organisation:'Example Co',business_email:'amina@example.com',destination_country_market:'Malaysia',expected_project_annual_use:'',documents_needed:['tds'],additional_context:''}
const options = {endpoint:'https://receiver.example.test',token:'secret',idempotencyKey:'72a190ef-315a-4a5a-91be-0329d316eb39',sourceContext:{source_page_id:'PRODUCT-000'}}

describe('Malaysia Sample Request receiver', () => {
  it('is unavailable without both server-only receiver settings', async () => {
    await expect(submitMalaysiaSampleRequest(values, {...options, endpoint:null})).resolves.toEqual({kind:'unavailable'})
    await expect(submitMalaysiaSampleRequest(values, {...options, token:null})).resolves.toEqual({kind:'unavailable'})
  })

  it('injects trusted scope/workflow/version metadata and accepts only explicit receipt confirmation', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ok:true,receipt_confirmed:true,request_reference:'SR-21'}), {status:200}))
    await expect(submitMalaysiaSampleRequest(values, {...options, fetcher})).resolves.toEqual({kind:'receipt_confirmed',requestReference:'SR-21'})
    const calls=fetcher.mock.calls as unknown as Array<[RequestInfo|URL,RequestInit]>
    const body = JSON.parse(String(calls[0]?.[1].body)) as Record<string, unknown>
    expect(body).toMatchObject({site_scope:'tio2-my',request_type:'sample_request',page_id:'CONV-SAMPLE',form_version:'request-sample-v0.1-malaysia',privacy_notice_version:'CONV-SAMPLE-G7-HANDOFF-01',idempotency_key:options.idempotencyKey})
  })

  it('fails unconfirmed for 2xx ambiguity, 422 and transport errors', async () => {
    await expect(submitMalaysiaSampleRequest(values, {...options, fetcher:async () => new Response(JSON.stringify({ok:true}), {status:200})})).resolves.toEqual({kind:'submission_unconfirmed'})
    await expect(submitMalaysiaSampleRequest(values, {...options, fetcher:async () => new Response('{}', {status:422})})).resolves.toEqual({kind:'submission_unconfirmed'})
    await expect(submitMalaysiaSampleRequest(values, {...options, fetcher:async () => {throw new Error('network')}})).resolves.toEqual({kind:'submission_unconfirmed'})
  })
})
