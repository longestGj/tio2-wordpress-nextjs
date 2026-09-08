import {validateMalaysiaSampleRequest, type MalaysiaSampleRequestErrors, type MalaysiaSampleRequestValues} from './malaysia-request-sample-validation'

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>
export type MalaysiaSampleReceiverResult =
  | {readonly kind:'receipt_confirmed';readonly requestReference?:string}
  | {readonly kind:'validation_failed';readonly errors:MalaysiaSampleRequestErrors}
  | {readonly kind:'submission_unconfirmed'}
  | {readonly kind:'unavailable'}

export interface MalaysiaSampleSourceContext {
  readonly source_page_id?: string
  readonly market_id?: string
  readonly process_context?: string
  readonly resource_context?: string
}

interface Options {readonly idempotencyKey:string;readonly sourceContext?:MalaysiaSampleSourceContext;readonly fetcher?:Fetcher;readonly timeoutMs?:number}
const SAMPLE_RECEIVER_ENDPOINT='/api/sample/submit'
export const MALAYSIA_SAMPLE_SUBMISSION_TIMEOUT_MS=12_000

export async function submitMalaysiaSampleRequest(values:MalaysiaSampleRequestValues,options:Options):Promise<MalaysiaSampleReceiverResult>{
  const errors=validateMalaysiaSampleRequest(values)
  if(Object.keys(errors).length)return {kind:'validation_failed',errors}
  const controller=new AbortController()
  const timeoutMs=options.timeoutMs&&Number.isFinite(options.timeoutMs)&&options.timeoutMs>0?options.timeoutMs:MALAYSIA_SAMPLE_SUBMISSION_TIMEOUT_MS
  const payload={values,idempotencyKey:options.idempotencyKey,sourceContext:options.sourceContext}
  let timeout:ReturnType<typeof setTimeout>|undefined
  try{
    const timeoutPromise=new Promise<never>((_resolve,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new DOMException('The Sample Request receiver timed out','AbortError'))},timeoutMs)})
    const requestPromise=Promise.resolve().then(async():Promise<MalaysiaSampleReceiverResult>=>{
      const response=await (options.fetcher??fetch)(SAMPLE_RECEIVER_ENDPOINT,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},credentials:'same-origin',cache:'no-store',referrerPolicy:'origin',redirect:'error',body:JSON.stringify(payload),signal:controller.signal})
      const mediaType=response.headers.get('content-type')?.split(';',1)[0]?.trim().toLowerCase()
      if(response.status!==200||mediaType!=='application/json')return {kind:'submission_unconfirmed'}
      const body=await response.json() as {ok?:unknown;receipt_confirmed?:unknown}
      return body.ok===true&&body.receipt_confirmed===true?{kind:'receipt_confirmed'}:{kind:'submission_unconfirmed'}
    })
    return await Promise.race([requestPromise,timeoutPromise])
  }catch{return {kind:'submission_unconfirmed'}}finally{if(timeout)clearTimeout(timeout)}
}
