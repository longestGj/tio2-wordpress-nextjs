import {NextResponse, type NextRequest} from 'next/server'
import {receiveMalaysiaSample, resolveMalaysiaSampleReceiverConfig} from '@/lib/request-sample/malaysia-sample-server'
export const runtime='nodejs'
const headers={'cache-control':'no-store'}
const rejected=(status:number)=>NextResponse.json({ok:false,receipt_confirmed:false},{status,headers})
export async function POST(request:NextRequest){
 const origin=request.headers.get('origin')
 if(origin&&origin!==request.nextUrl.origin)return rejected(403)
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return rejected(415)
 const config=resolveMalaysiaSampleReceiverConfig(process.env)
 if(!config)return rejected(503)
 let body:unknown
 try{
  const reader=request.body?.getReader();if(!reader)return rejected(400)
  const chunks:Uint8Array[]=[];let length=0
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>32768){await reader.cancel();return rejected(413)}chunks.push(value)}
  body=JSON.parse(Buffer.concat(chunks).toString('utf8'))
 }catch{return rejected(400)}
 const result=await receiveMalaysiaSample(body,config)
 return NextResponse.json(result.body,{status:result.status,headers})
}
