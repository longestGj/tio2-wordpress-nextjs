import {createHash, createHmac, randomUUID} from 'node:crypto'
import {mkdir, open, readFile, rename, rmdir} from 'node:fs/promises'
import {isAbsolute, join} from 'node:path'
import {buildSubmissionEnvironment, resolveSubmissionEnvironment, type SubmissionEnvironment} from '@/lib/forms/submission-environment'
import {validateMalaysiaSampleRequest, type MalaysiaSampleRequestValues} from './malaysia-request-sample-validation'
import type {MalaysiaSampleSourceContext} from './malaysia-request-sample-receiver'

type Provider = (input: string, init: RequestInit) => Promise<Response>
export interface SampleReceiverConfig {readonly siteScope:string;readonly recipient:string;readonly accessKey:string;readonly directory:string;readonly environment:SubmissionEnvironment}
interface Input {values:MalaysiaSampleRequestValues;idempotencyKey:string;sourceContext?:MalaysiaSampleSourceContext}
type ReceiptState = 'pending'|'confirmed'|'rejected'|'uncertain'
interface Receipt {version:1;siteScope:'tio2-my';fingerprint:string;state:ReceiptState;updatedAt:string}
const negative = (status=502) => ({status,body:{ok:false,receipt_confirmed:false}})
const confirmed = () => ({status:200,body:{ok:true,receipt_confirmed:true}})
const strings = ['grade_id','application_id','application_other','test_objective','current_grade_or_target','contact_name','company_organisation','business_email','destination_country_market','expected_project_annual_use','additional_context'] as const
const contextFields = ['source_page_id','market_id','process_context','resource_context'] as const
const isRecord = (v:unknown):v is Record<string,unknown> => Boolean(v)&&typeof v==='object'&&!Array.isArray(v)

export function resolveMalaysiaSampleReceiverConfig(env:Readonly<Record<string,string|undefined>>):SampleReceiverConfig|null {
 try {
  const key=env.NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY?.trim()
  const directory=env.TIO2_MY_SAMPLE_RECEIPT_DIRECTORY
  const binding=JSON.parse(env.TIO2_MY_SAMPLE_RECEIVER_BINDING??'null')
  if(env.SITE_ID!=='tio2-my'||!key||!directory||!isAbsolute(directory)||!isRecord(binding)||binding.site_scope!=='tio2-my'||typeof binding.recipient!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(binding.recipient)||binding.key_sha256!==createHash('sha256').update(key).digest('hex')) return null
  return {siteScope:'tio2-my',recipient:binding.recipient,accessKey:key,directory,environment:resolveSubmissionEnvironment(env.NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT)}
 }catch{return null}
}

function parseInput(body:unknown):Input|null {
 if(!isRecord(body)||Object.keys(body).some(k=>!['values','idempotencyKey','sourceContext'].includes(k))||typeof body.idempotencyKey!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.idempotencyKey)||!isRecord(body.values))return null
 const value=body.values
 if(Object.keys(value).some(k=>![...strings,'documents_needed'].includes(k as typeof strings[number]))||strings.some(k=>typeof value[k]!=='string')||!Array.isArray(value.documents_needed)||value.documents_needed.length>10||value.documents_needed.some(x=>typeof x!=='string'))return null
 const values={...Object.fromEntries(strings.map(k=>[k,(value[k] as string).trim()])),documents_needed:[...new Set(value.documents_needed as string[])].sort()} as unknown as MalaysiaSampleRequestValues
 if(Object.keys(validateMalaysiaSampleRequest(values)).length)return null
 const sourceContext:Record<string,string>={}
 if(body.sourceContext!==undefined){if(!isRecord(body.sourceContext)||Object.keys(body.sourceContext).some(k=>!contextFields.includes(k as typeof contextFields[number])))return null
 for(const k of contextFields){const v=body.sourceContext[k];if(v!==undefined){if(typeof v!=='string'||v.length>120)return null;sourceContext[k]=v.trim()}}}
 return {values,idempotencyKey:body.idempotencyKey.toLowerCase(),sourceContext}
}

function providerPayload(input:Input,config:SampleReceiverConfig){
 const {values,sourceContext}=input,accessKey=config.accessKey
 const trim=(v:string)=>v.trim()
 const submissionEnvironment=buildSubmissionEnvironment(config.environment??undefined,input.idempotencyKey,'TiO2 Malaysia sample request')
  return {
    access_key:accessKey,
    subject:submissionEnvironment.subject,
    from_name:'TiO2 Malaysia Request a Sample',
    email:trim(values.business_email),
    site_scope:'tio2-my',request_type:'sample_request',page_id:'CONV-SAMPLE',workflow:'request_sample',idempotency_key:input.idempotencyKey,
    ...submissionEnvironment.fields,
    form_version:'request-sample-v0.1-malaysia',privacy_notice_version:'CONV-SAMPLE-G7-HANDOFF-01',
    grade_id:values.grade_id,
    application_id:values.application_id,
    ...(values.application_id==='other'?{application_other:trim(values.application_other)}:{}),
    test_objective:trim(values.test_objective),
    ...(trim(values.current_grade_or_target)?{current_grade_or_target:trim(values.current_grade_or_target)}:{}),
    contact_name:trim(values.contact_name),
    company_organisation:trim(values.company_organisation),
    business_email:trim(values.business_email),
    destination_country_market:trim(values.destination_country_market),
    ...(trim(values.expected_project_annual_use)?{expected_project_annual_use:trim(values.expected_project_annual_use)}:{}),
    documents_needed:[...new Set(values.documents_needed)],
    ...(trim(values.additional_context)?{additional_context:trim(values.additional_context)}:{}),
    ...(sourceContext?.source_page_id?.trim()?{source_page_id:sourceContext.source_page_id.trim()}:{}),
    ...(sourceContext?.market_id?.trim()?{market_id:sourceContext.market_id.trim()}:{}),
    ...(sourceContext?.process_context?.trim()?{process_context:sourceContext.process_context.trim()}:{}),
    ...(sourceContext?.resource_context?.trim()?{resource_context:sourceContext.resource_context.trim()}:{}),
  }
}

async function persist(path:string,receipt:Receipt){
 const temporary=path+'.'+randomUUID()+'.tmp'
 const file=await open(temporary,'wx',0o600)
 try{await file.writeFile(JSON.stringify(receipt));await file.sync()}finally{await file.close()}
 await rename(temporary,path)
}

export async function receiveMalaysiaSample(body:unknown,config:SampleReceiverConfig|null,provider:Provider=fetch){
 if(!config||config.siteScope!=='tio2-my'||!config.accessKey||!config.recipient||!isAbsolute(config.directory))return negative(503)
 const input=parseInput(body);if(!input)return negative(400)
 const key=createHash('sha256').update('tio2-my:sample:'+input.idempotencyKey).digest('hex')
 const fingerprint=createHmac('sha256',config.accessKey).update(JSON.stringify({recipient:config.recipient,environment:config.environment,input})).digest('hex')
 const path=join(config.directory,key+'.json'),lock=join(config.directory,key+'.lock')
 let locked=false
 try{
  await mkdir(config.directory,{recursive:true,mode:0o700})
  // Confirmed records are terminal. A crashed owner may leave a lock after persisting one.
  try {
   const existing=JSON.parse(await readFile(path,'utf8')) as Receipt
   if(existing.version===1&&existing.siteScope==='tio2-my'&&existing.state==='confirmed') return existing.fingerprint===fingerprint?confirmed():negative(409)
  }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
  try{await mkdir(lock);locked=true}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')return negative(202);throw error}
  let prior:Receipt|null=null
  try{prior=JSON.parse(await readFile(path,'utf8')) as Receipt}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
  if(prior){
   if(prior.version!==1||prior.siteScope!=='tio2-my'||prior.fingerprint!==fingerprint)return negative(409)
   if(prior.state==='confirmed')return confirmed()
   if(prior.state!=='rejected')return negative(202)
  }
  const receipt:Receipt={version:1,siteScope:'tio2-my',fingerprint,state:'pending',updatedAt:new Date().toISOString()}
  await persist(path,receipt)
  let state:ReceiptState='uncertain'
  try{
   const response=await provider('https://api.web3forms.com/submit',{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},redirect:'error',cache:'no-store',body:JSON.stringify(providerPayload(input,config)),signal:AbortSignal.timeout(10000)})
   if([400,422,429].includes(response.status))state='rejected'
   else if(response.status===200&&response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()==='application/json'){
    const result:unknown=await response.json()
    if(isRecord(result)&&result.success===true)state='confirmed'
    else if(isRecord(result)&&result.success===false)state='rejected'
   }
  }catch{/* Unknown provider outcome must never cause a blind resend. */}
  await persist(path,{...receipt,state,updatedAt:new Date().toISOString()})
  return state==='confirmed'?confirmed():negative()
 }catch{return negative(503)}finally{if(locked)await rmdir(lock).catch(()=>undefined)}
}
