import {submitMalaysiaSampleRequest} from '@/lib/request-sample/malaysia-request-sample-receiver'
import {resolveMalaysiaSamplePrefill} from '@/lib/request-sample/malaysia-request-sample-prefill'
import type {MalaysiaSampleRequestValues} from '@/lib/request-sample/malaysia-request-sample-validation'
import {getCurrentSite} from '@/lib/sites/current-site'

export const runtime='nodejs'
type UnknownRecord=Record<string,unknown>
const MAX_BODY_BYTES=32*1024
const text=(value:unknown)=>typeof value==='string'?value:''
const uuid=(value:unknown):string|null=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)?value:null
const json=(status:number,body:UnknownRecord)=>Response.json(body,{status,headers:{'cache-control':'no-store'}})

async function readBoundedJson(request:Request):Promise<unknown>{
  const length=request.headers.get('content-length')
  if(length!==null&&(!/^\d+$/u.test(length)||Number(length)>MAX_BODY_BYTES))throw new RangeError('body size')
  if(!request.body)throw new SyntaxError('empty body')
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY_BYTES){void reader.cancel().catch(()=>undefined);throw new RangeError('body size')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
}

export async function POST(request:Request):Promise<Response>{
  let site
  try{site=getCurrentSite()}catch{return json(404,{ok:false,receipt_confirmed:false,kind:'not_found'})}
  if(site.id!=='tio2-my'||site.wordpressScope!=='tio2-my')return json(404,{ok:false,receipt_confirmed:false,kind:'not_found'})
  const requestUrl=new URL(request.url);const allowedOrigins=new Set([requestUrl.origin,new URL(site.url).origin])
  const requestOrigin=request.headers.get('origin')
  if(!requestOrigin||!allowedOrigins.has(requestOrigin))return json(403,{ok:false,receipt_confirmed:false,kind:'invalid_origin'})
  if(!/^application\/json(?:\s*;|$)/iu.test(request.headers.get('content-type')??''))return json(415,{ok:false,receipt_confirmed:false,kind:'invalid_content_type'})
  let input:unknown
  try{input=await readBoundedJson(request)}catch(error){return json(error instanceof RangeError?413:400,{ok:false,receipt_confirmed:false,kind:error instanceof RangeError?'request_too_large':'invalid_request'})}
  if(!input||typeof input!=='object'||Array.isArray(input))return json(400,{ok:false,receipt_confirmed:false,kind:'invalid_request'})
  const body=input as UnknownRecord;const key=uuid(body.idempotency_key)
  if(!key)return json(400,{ok:false,receipt_confirmed:false,kind:'invalid_request'})
  const values:MalaysiaSampleRequestValues={grade_id:text(body.grade_id),application_id:text(body.application_id),application_other:text(body.application_other),test_objective:text(body.test_objective),current_grade_or_target:text(body.current_grade_or_target),contact_name:text(body.contact_name),company_organisation:text(body.company_organisation),business_email:text(body.business_email),destination_country_market:text(body.destination_country_market),expected_project_annual_use:text(body.expected_project_annual_use),documents_needed:Array.isArray(body.documents_needed)?body.documents_needed.filter((value):value is string=>typeof value==='string'):[],additional_context:text(body.additional_context)}
  const rawSource=body.source_context&&typeof body.source_context==='object'&&!Array.isArray(body.source_context)?body.source_context as UnknownRecord:{}
  const normalizedSource=resolveMalaysiaSamplePrefill({source_page_id:text(rawSource.source_page_id),grade_id:values.grade_id,application_id:values.application_id,market_id:text(rawSource.market_id),process_context:text(rawSource.process_context),resource_context:text(rawSource.resource_context)})
  const sourceContext=normalizedSource.source_page_id?{source_page_id:normalizedSource.source_page_id,...(normalizedSource.market_id?{market_id:normalizedSource.market_id}:{}),...(normalizedSource.process_context?{process_context:normalizedSource.process_context}:{}),...(normalizedSource.resource_context?{resource_context:normalizedSource.resource_context}:{})}:{}
  const result=await submitMalaysiaSampleRequest(values,{endpoint:process.env.TIO2_MY_REQUEST_SAMPLE_RECEIVER_URL??null,token:process.env.TIO2_MY_REQUEST_SAMPLE_RECEIVER_TOKEN??null,idempotencyKey:key,sourceContext})
  if(result.kind==='receipt_confirmed')return json(200,{ok:true,receipt_confirmed:true,kind:result.kind,...(result.requestReference?{request_reference:result.requestReference}:{})})
  if(result.kind==='validation_failed')return json(400,{ok:false,receipt_confirmed:false,kind:result.kind,errors:result.errors})
  if(result.kind==='unavailable')return json(503,{ok:false,receipt_confirmed:false,kind:result.kind})
  return json(502,{ok:false,receipt_confirmed:false,kind:result.kind})
}
