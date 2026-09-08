import {mkdir,mkdtemp, readFile, readdir, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {receiveMalaysiaSample, resolveMalaysiaSampleReceiverConfig} from '@/lib/request-sample/malaysia-sample-server'

const values = {grade_id:'M-2196',application_id:'coatings',application_other:'',test_objective:'Evaluate dispersion.',current_grade_or_target:'',contact_name:'Test Person',company_organisation:'Test Company',business_email:'test@example.com',destination_country_market:'Malaysia',expected_project_annual_use:'',documents_needed:['tds'],additional_context:''}
const body = {values,idempotencyKey:'72a190ef-315a-4a5a-91be-0329d316eb39',sourceContext:{source_page_id:'PRODUCT-000'}}
let directory:string
beforeEach(async()=>{directory=await mkdtemp(join(tmpdir(),'sct-sample-'))})
afterEach(async()=>{await rm(directory,{recursive:true,force:true})})
function config(){return {siteScope:'tio2-my' as const,recipient:'receiver@example.com',accessKey:'test-only-key',directory,environment:null}}
const positive = () => new Response(JSON.stringify({success:true}),{status:200,headers:{'content-type':'application/json'}})
it('confirms only after provider success and durable dedup; replay does not resubmit',async()=>{
 const provider=vi.fn(async()=>positive())
 const result=await receiveMalaysiaSample(body,config(),provider)
 expect(result).toEqual({status:200,body:{ok:true,receipt_confirmed:true}})
 expect(await receiveMalaysiaSample(body,config(),provider)).toEqual(result)
 expect(provider).toHaveBeenCalledTimes(1)
 const stored=await Promise.all((await readdir(directory)).filter(x=>x.endsWith('.json')).map(x=>readFile(join(directory,x),'utf8')))
 expect(stored).toHaveLength(1)
 expect(stored.join('')).not.toMatch(/Test Person|test@example.com|Test Company|test-only-key/)
})
it('coalesces concurrent activation and rejects changed payload under the same key',async()=>{
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r});const provider=vi.fn(async()=>{await gate;return positive()})
 const first=receiveMalaysiaSample(body,config(),provider)
 await vi.waitFor(()=>expect(provider).toHaveBeenCalledTimes(1))
 expect((await receiveMalaysiaSample(body,config(),provider)).body.receipt_confirmed).toBe(false)
 release();await first
 expect((await receiveMalaysiaSample({...body,values:{...values,test_objective:'Changed'}},config(),provider)).status).toBe(409)
 expect(provider).toHaveBeenCalledTimes(1)
})
it.each([['non-json',()=>new Response('accepted',{headers:{'content-type':'text/plain'}})],['partial',()=>new Response(JSON.stringify({ok:true,receipt_confirmed:true}),{headers:{'content-type':'application/json'}})],['network',()=>{throw new Error('network')}],['server-error',()=>new Response('unknown',{status:500})]])('keeps %s uncertain and prevents blind retry',async(_name,response)=>{
 const provider=vi.fn(async()=>response())
 expect((await receiveMalaysiaSample(body,config(),provider)).body.receipt_confirmed).toBe(false)
 expect((await receiveMalaysiaSample(body,config(),provider)).body.receipt_confirmed).toBe(false)
 expect(provider).toHaveBeenCalledTimes(1)
})
it('allows a definite provider rejection to retry the same request without false acknowledgement',async()=>{
 const provider=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({success:false}),{status:200,headers:{'content-type':'application/json'}})).mockResolvedValueOnce(positive())
 expect((await receiveMalaysiaSample(body,config(),provider)).body.receipt_confirmed).toBe(false)
 expect((await receiveMalaysiaSample(body,config(),provider)).body.receipt_confirmed).toBe(true)
 expect(provider).toHaveBeenCalledTimes(2)
})
it('rejects malformed values, forged receipt/recipient/scope and unsafe request IDs before network',async()=>{
 const provider=vi.fn(async()=>positive())
 for(const input of [null,{...body,receipt_confirmed:true},{...body,recipient:'other@example.com'},{...body,site_scope:'tio2-a'},{...body,idempotencyKey:'../bad'},{...body,values:{...values,documents_needed:'tds'}}]) expect((await receiveMalaysiaSample(input,config(),provider)).status).toBe(400)
 expect((await receiveMalaysiaSample(body,{...config(),siteScope:'tio2-a'},provider)).status).toBe(503)
 expect(provider).not.toHaveBeenCalled()
})
it('requires a scoped recipient binding matching the configured key and persistent directory',()=>{
 const env={SITE_ID:'tio2-my',NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY:'test-only-key',TIO2_MY_SAMPLE_RECEIPT_DIRECTORY:directory,TIO2_MY_SAMPLE_RECEIVER_BINDING:JSON.stringify({site_scope:'tio2-my',recipient:'receiver@example.com',key_sha256:createHash('sha256').update('test-only-key').digest('hex')})}
 expect(resolveMalaysiaSampleReceiverConfig(env)?.recipient).toBe('receiver@example.com')
 expect(resolveMalaysiaSampleReceiverConfig({...env,SITE_ID:'tio2-a'})).toBeNull()
 expect(resolveMalaysiaSampleReceiverConfig({...env,TIO2_MY_SAMPLE_RECEIVER_BINDING:''})).toBeNull()
 expect(resolveMalaysiaSampleReceiverConfig({...env,NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY:'wrong-key'})).toBeNull()
})

it('replays a durable confirmation even if the process left its lock behind',async()=>{
 const provider=vi.fn(async()=>positive());expect((await receiveMalaysiaSample(body,config(),provider)).status).toBe(200)
 const key=createHash('sha256').update('tio2-my:sample:'+body.idempotencyKey).digest('hex')
 await mkdir(join(directory,key+'.lock'))
 expect((await receiveMalaysiaSample(body,config(),provider)).body.receipt_confirmed).toBe(true)
 expect(provider).toHaveBeenCalledTimes(1)
})
