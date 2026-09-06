import {validateMalaysiaSampleRequest, type MalaysiaSampleRequestErrors, type MalaysiaSampleRequestValues} from './malaysia-request-sample-validation'

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>
export type MalaysiaSampleReceiverResult =
  | {readonly kind:'receipt_confirmed';readonly requestReference?:string}
  | {readonly kind:'validation_failed';readonly errors:MalaysiaSampleRequestErrors}
  | {readonly kind:'submission_unconfirmed'}
  | {readonly kind:'unavailable'}

interface Options {readonly endpoint:string|null;readonly token:string|null;readonly idempotencyKey:string;readonly sourceContext?:Record<string,unknown>;readonly fetcher?:Fetcher}
const trim = (value:string) => value.trim()

export async function submitMalaysiaSampleRequest(values:MalaysiaSampleRequestValues,options:Options):Promise<MalaysiaSampleReceiverResult>{
  const errors=validateMalaysiaSampleRequest(values)
  if(Object.keys(errors).length)return {kind:'validation_failed',errors}
  if(!options.endpoint||!options.token)return {kind:'unavailable'}
  try{
    const response=await (options.fetcher??fetch)(options.endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${options.token}`},cache:'no-store',signal:AbortSignal.timeout(12_000),body:JSON.stringify({
      site_scope:'tio2-my',request_type:'sample_request',page_id:'CONV-SAMPLE',idempotency_key:options.idempotencyKey,
      form_version:'request-sample-v0.1-malaysia',privacy_notice_version:'CONV-SAMPLE-G7-HANDOFF-01',
      fields:{...values,application_other:values.application_id==='other'?trim(values.application_other):undefined,test_objective:trim(values.test_objective),current_grade_or_target:trim(values.current_grade_or_target)||undefined,contact_name:trim(values.contact_name),company_organisation:trim(values.company_organisation),business_email:trim(values.business_email),destination_country_market:trim(values.destination_country_market),expected_project_annual_use:trim(values.expected_project_annual_use)||undefined,documents_needed:[...new Set(values.documents_needed)],additional_context:trim(values.additional_context)||undefined},
      ...(options.sourceContext&&Object.keys(options.sourceContext).length?{source_context:options.sourceContext}:{}),
    })})
    if(!response.ok)return {kind:'submission_unconfirmed'}
    const body=await response.json() as {ok?:unknown;receipt_confirmed?:unknown;request_reference?:unknown}
    if(body.ok!==true||body.receipt_confirmed!==true)return {kind:'submission_unconfirmed'}
    return typeof body.request_reference==='string'&&body.request_reference.trim()?{kind:'receipt_confirmed',requestReference:body.request_reference.trim()}:{kind:'receipt_confirmed'}
  }catch{return {kind:'submission_unconfirmed'}}
}
