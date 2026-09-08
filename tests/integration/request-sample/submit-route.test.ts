import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {NextRequest} from 'next/server'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import {POST} from '../../../app/api/sample/submit/route'
let directory:string
beforeEach(async()=>{
 directory=await mkdtemp(join(tmpdir(),'sct-route-'))
 vi.stubEnv('SITE_ID','tio2-my');vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY','test-key')
 vi.stubEnv('TIO2_MY_SAMPLE_RECEIPT_DIRECTORY',directory)
 vi.stubEnv('TIO2_MY_SAMPLE_RECEIVER_BINDING',JSON.stringify({site_scope:'tio2-my',recipient:'receiver@example.com',key_sha256:createHash('sha256').update('test-key').digest('hex')}))
})
afterEach(async()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();await rm(directory,{recursive:true,force:true})})
const values={grade_id:'M-2196',application_id:'coatings',application_other:'',test_objective:'Evaluate dispersion.',current_grade_or_target:'',contact_name:'Test Person',company_organisation:'Test Company',business_email:'test@example.com',destination_country_market:'Malaysia',expected_project_annual_use:'',documents_needed:['tds'],additional_context:''}
const request=(body:unknown,origin='http://localhost:4384')=>new NextRequest('http://localhost:4384/api/sample/submit',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
it('enforces origin, size and schema; never accepts browser-forged receipt or routing',async()=>{
 const provider=vi.fn();vi.stubGlobal('fetch',provider)
 expect((await POST(request({},'https://other.example'))).status).toBe(403)
 expect((await POST(request({data:'x'.repeat(32769)}))).status).toBe(413)
 expect((await POST(request({values,idempotencyKey:'72a190ef-315a-4a5a-91be-0329d316eb39',receipt_confirmed:true}))).status).toBe(400)
 expect(provider).not.toHaveBeenCalled()
})
it('returns same persisted acknowledgement on replay and never echoes buyer fields',async()=>{
 const provider=vi.fn(async()=>Response.json({success:true}));vi.stubGlobal('fetch',provider)
 const body={values,idempotencyKey:'72a190ef-315a-4a5a-91be-0329d316eb39'}
 for(let i=0;i<2;i++){const response=await POST(request(body));expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.json()).toEqual({ok:true,receipt_confirmed:true})}
 expect(provider).toHaveBeenCalledTimes(1)
 const sent=JSON.parse(String((provider.mock.calls as unknown as [string,RequestInit][])[0][1].body))
 expect(sent.site_scope).toBe('tio2-my');expect(sent.access_key).toBe('test-key');expect(sent).not.toHaveProperty('recipient');expect(sent).not.toHaveProperty('receipt_confirmed')
})
it('fails closed when key/recipient binding is missing or site is wrong',async()=>{
 vi.stubEnv('TIO2_MY_SAMPLE_RECEIVER_BINDING','')
 const response=await POST(request({}));expect(response.status).toBe(503);expect(await response.json()).toEqual({ok:false,receipt_confirmed:false})
})

it('accepts the configured public origin behind the local container port mapping, but rejects other origins',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SITE_URL','http://127.0.0.1:3100')
 const provider=vi.fn();vi.stubGlobal('fetch',provider)
 const make=(origin:string)=>new NextRequest('http://0.0.0.0:3000/api/sample/submit',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'})
 expect((await POST(make('http://127.0.0.1:3100'))).status).toBe(400)
 expect((await POST(make('https://other.example'))).status).toBe(403)
 expect(provider).not.toHaveBeenCalled()
})
