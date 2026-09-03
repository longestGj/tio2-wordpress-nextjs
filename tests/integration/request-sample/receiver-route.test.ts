import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {POST} from '@/app/api/tio2-my/request-sample/route'

const valid = {grade_id:'M-2196',application_id:'coatings',application_other:'',test_objective:'Evaluate dispersion.',current_grade_or_target:'',contact_name:'Amina Tan',company_organisation:'Example Co',business_email:'amina@example.com',destination_country_market:'Malaysia',expected_project_annual_use:'',documents_needed:['tds'],additional_context:'',idempotency_key:'72a190ef-315a-4a5a-91be-0329d316eb39',source_context:{source_page_id:'PRODUCT-000'}}
const request = (body: unknown, headers: Record<string,string> = {}) => new Request('https://tio2malaysia.com/api/tio2-my/request-sample', {method:'POST',headers:{'content-type':'application/json',origin:'https://tio2malaysia.com',...headers},body:JSON.stringify(body)})

beforeEach(() => vi.stubEnv('SITE_ID','tio2-my'))
afterEach(() => {vi.unstubAllEnvs();vi.unstubAllGlobals()})

describe('CONV-SAMPLE same-origin receiver route', () => {
  it('revalidates values and returns only safe errors', async () => {
    const response = await POST(request({...valid, grade_id:'TIOVAR'}))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ok:false,receipt_confirmed:false,kind:'validation_failed',errors:{grade_id:'Choose a product grade or select “I do not know the grade”.'}})
  })
  it('returns service unavailable when receiver configuration is absent', async () => {
    const response = await POST(request(valid)); expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ok:false,receipt_confirmed:false,kind:'unavailable'})
  })
  it('returns success only for explicit downstream confirmation', async () => {
    vi.stubEnv('TIO2_MY_REQUEST_SAMPLE_RECEIVER_URL','https://receiver.example.test');vi.stubEnv('TIO2_MY_REQUEST_SAMPLE_RECEIVER_TOKEN','secret')
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({ok:true,receipt_confirmed:true}),{status:200})))
    const response=await POST(request(valid));expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true,receipt_confirmed:true,kind:'receipt_confirmed'})
  })
  it('rejects wrong site, origin, content type, body size and malformed JSON', async () => {
    vi.stubEnv('SITE_ID','tio2-a');expect((await POST(request(valid))).status).toBe(404);vi.stubEnv('SITE_ID','tio2-my')
    expect((await POST(request(valid,{origin:'https://other.example'}))).status).toBe(403)
    expect((await POST(request(valid,{origin:'https://evil.example','x-forwarded-host':'evil.example','x-forwarded-proto':'https'}))).status).toBe(403)
    expect((await POST(request(valid,{'content-type':'text/plain'}))).status).toBe(415)
    expect((await POST(request(valid,{'content-length':'40000'}))).status).toBe(413)
    expect((await POST(new Request('https://tio2malaysia.com/api/tio2-my/request-sample',{method:'POST',headers:{'content-type':'application/json',origin:'https://tio2malaysia.com'},body:'{bad'}))).status).toBe(400)
  })
  it('accepts the complete worst-case valid Unicode payload within the bounded envelope',async()=>{
    vi.stubEnv('TIO2_MY_REQUEST_SAMPLE_RECEIVER_URL','https://receiver.example.test');vi.stubEnv('TIO2_MY_REQUEST_SAMPLE_RECEIVER_TOKEN','secret')
    const downstream=vi.fn(async()=>new Response(JSON.stringify({ok:true,receipt_confirmed:true}),{status:200}));vi.stubGlobal('fetch',downstream)
    const response=await POST(request({...valid,application_id:'other',application_other:'😀'.repeat(500),test_objective:'😀'.repeat(2000),current_grade_or_target:'😀'.repeat(1000),contact_name:'😀'.repeat(120),company_organisation:'😀'.repeat(200),business_email:`${'a'.repeat(242)}@example.com`,destination_country_market:'😀'.repeat(120),expected_project_annual_use:'😀'.repeat(500),documents_needed:['tds','sds','coa','coo','other_not_sure'],additional_context:'😀'.repeat(2000)}))
    expect(response.status).toBe(200);expect(downstream).toHaveBeenCalledOnce()
  })
  it('preserves only validated non-personal provenance before forwarding', async () => {
    vi.stubEnv('TIO2_MY_REQUEST_SAMPLE_RECEIVER_URL','https://receiver.example.test');vi.stubEnv('TIO2_MY_REQUEST_SAMPLE_RECEIVER_TOKEN','secret')
    const downstream=vi.fn(async()=>new Response(JSON.stringify({ok:true,receipt_confirmed:true}),{status:200}));vi.stubGlobal('fetch',downstream)
    await POST(request({...valid,grade_id:'M-2377',source_context:{source_page_id:'GRADE-M2377',market_id:'MARKET-UK-001',process_context:'sulfate',resource_context:'RES-ORIGIN'}}))
    const calls=downstream.mock.calls as unknown as Array<[RequestInfo|URL,RequestInit]>
    const payload=JSON.parse(String(calls[0]?.[1].body)) as Record<string,unknown>
    expect(payload.source_context).toEqual({source_page_id:'GRADE-M2377',process_context:'sulfate',resource_context:'RES-ORIGIN'})
    downstream.mockClear()
    await POST(request({...valid,grade_id:'M-2377',source_context:{source_page_id:'TIOVAR-HOME',market_id:'FOREIGN',process_context:'chloride',resource_context:'PRIVATE-1'}}))
    const invalidCalls=downstream.mock.calls as unknown as Array<[RequestInfo|URL,RequestInit]>
    const invalidPayload=JSON.parse(String(invalidCalls[0]?.[1].body)) as Record<string,unknown>
    expect(invalidPayload).not.toHaveProperty('source_context')
  })
})
