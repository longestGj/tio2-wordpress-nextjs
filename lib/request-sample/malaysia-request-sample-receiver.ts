import {validateMalaysiaSampleRequest, type MalaysiaSampleRequestErrors, type MalaysiaSampleRequestValues} from './malaysia-request-sample-validation'

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>
export type MalaysiaSampleReceiverResult =
  | {readonly kind:'receipt_confirmed';readonly requestReference?:string}
  | {readonly kind:'validation_failed';readonly errors:MalaysiaSampleRequestErrors}
  | {readonly kind:'submission_unconfirmed'}
  | {readonly kind:'unavailable'}

interface Options {readonly accessKey:string|null;readonly idempotencyKey:string;readonly sourceContext?:Record<string,unknown>;readonly fetcher?:Fetcher;readonly timeoutMs?:number}
const WEB3FORMS_ENDPOINT='https://api.web3forms.com/submit'
export const MALAYSIA_SAMPLE_SUBMISSION_TIMEOUT_MS=12_000
const trim = (value:string) => value.trim()

export async function submitMalaysiaSampleRequest(values:MalaysiaSampleRequestValues,options:Options):Promise<MalaysiaSampleReceiverResult>{
  const errors=validateMalaysiaSampleRequest(values)
  if(Object.keys(errors).length)return {kind:'validation_failed',errors}
  const accessKey=options.accessKey?.trim()
  if(!accessKey)return {kind:'unavailable'}
  const controller=new AbortController()
  const timeoutMs=options.timeoutMs&&Number.isFinite(options.timeoutMs)&&options.timeoutMs>0?options.timeoutMs:MALAYSIA_SAMPLE_SUBMISSION_TIMEOUT_MS
  const payload={
    access_key:accessKey,
    subject:'TiO2 Malaysia sample request',
    from_name:'TiO2 Malaysia Request a Sample',
    email:trim(values.business_email),
    site_scope:'tio2-my',request_type:'sample_request',page_id:'CONV-SAMPLE',idempotency_key:options.idempotencyKey,
    form_version:'request-sample-v0.1-malaysia',privacy_notice_version:'CONV-SAMPLE-G7-HANDOFF-01',
    fields:{...values,application_other:values.application_id==='other'?trim(values.application_other):undefined,test_objective:trim(values.test_objective),current_grade_or_target:trim(values.current_grade_or_target)||undefined,contact_name:trim(values.contact_name),company_organisation:trim(values.company_organisation),business_email:trim(values.business_email),destination_country_market:trim(values.destination_country_market),expected_project_annual_use:trim(values.expected_project_annual_use)||undefined,documents_needed:[...new Set(values.documents_needed)],additional_context:trim(values.additional_context)||undefined},
    ...(options.sourceContext&&Object.keys(options.sourceContext).length?{source_context:options.sourceContext}:{}),
  }
  let timeout:ReturnType<typeof setTimeout>|undefined
  try{
    const timeoutPromise=new Promise<never>((_resolve,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new DOMException('The Sample Request receiver timed out','AbortError'))},timeoutMs)})
    const requestPromise=Promise.resolve().then(async():Promise<MalaysiaSampleReceiverResult>=>{
      const response=await (options.fetcher??fetch)(WEB3FORMS_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},cache:'no-store',redirect:'error',body:JSON.stringify(payload),signal:controller.signal})
      const mediaType=response.headers.get('content-type')?.split(';',1)[0]?.trim().toLowerCase()
      if(response.status!==200||mediaType!=='application/json')return {kind:'submission_unconfirmed'}
      const body=await response.json() as {success?:unknown}
      return body.success===true?{kind:'receipt_confirmed'}:{kind:'submission_unconfirmed'}
    })
    return await Promise.race([requestPromise,timeoutPromise])
  }catch{return {kind:'submission_unconfirmed'}}finally{if(timeout)clearTimeout(timeout)}
}
