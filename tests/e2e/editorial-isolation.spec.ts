import {test,expect} from '@playwright/test'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHmac,randomUUID} from 'node:crypto'
import {resolve} from 'node:path'
import {getEditorialContract} from './editorial-fixtures'
const base=process.env.TIO2_MY_BASE_URL??'http://127.0.0.1:3216'
const env=Object.fromEntries(readFileSync('wordpress/.env','utf8').split(/\r?\n/u).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}))
const output=resolve('docs/verification/tio2-my/trade4-app5-20260908/isolation')
function probe(id:string,mode:string) {
 const result=execFileSync('docker',['compose','-p','tio2my9','--env-file','wordpress/.env','-f','.tmp/docker-compose.editorial.yml','run','--rm','wpcli','wp','eval-file','/workspace/tests/infrastructure/php/editorial-state.php',id,mode],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:45_000})
 return JSON.parse(result)
}
for(const id of ['APP-COAT','RES-TRADE-EU'])test(`${id} real CMS mutations cannot serve stale or foreign content`,async({request})=>{
 test.setTimeout(300_000);mkdirSync(output,{recursive:true})
 expect(['127.0.0.1','localhost']).toContain(new URL(base).hostname)
 const page=getEditorialContract(id),snapshot=probe(id,'Snapshot'),ledger:unknown[]=[]
 async function invalidate() {
  const body=JSON.stringify({eventId:randomUUID(),siteIds:['tio2-my'],contentId:snapshot.postId,paths:[page.identity.path.replace(/\/$/u,''),...(id.startsWith('RES-TRADE')?['/resources']:[])],entityIds:[],modified:new Date().toISOString()})
  const result=await request.post(base+'/api/revalidate',{headers:{'content-type':'application/json','x-tio2-signature':createHmac('sha256',env.EDITORIAL_REVALIDATION_SECRET).update(body).digest('hex')},data:body})
  expect(result.status()).toBe(200);return result.json()
 }
 try {
  expect((await request.get(base+page.identity.path)).status()).toBe(200)
  for(const mode of id.startsWith('RES-TRADE')?['Withdraw','Pending','Expired']:['Draft','Foreign','Multi','MissingScope','Malformed','Duplicate']) {
   const mutation=probe(id,mode);expect(mutation.resolverValid).toBe(false)
   const invalidation=await invalidate()
   const response=await request.get(base+page.identity.path),html=await response.text()
   expect(html).not.toContain(page.heading)
   expect(html).not.toContain(page.seo.metaDescription)
   expect(html).not.toContain(page.seo.canonical+'#webpage')
   expect(response.status()).toBe(404)
   ledger.push({mode,mutation,invalidation,status:response.status(),factsSuppressed:true})
   const restore=probe(id,'Restore');expect(restore.resolverValid).toBe(true);await invalidate()
   expect((await request.get(base+page.identity.path)).status()).toBe(200)
  }
 }finally {probe(id,'Restore');await invalidate();writeFileSync(resolve(output,id+'.json'),JSON.stringify({id,time:new Date().toISOString(),ledger,restored:true},null,2))}
})
test('private editorial API rejects anonymous, foreign and missing scope requests',async({request})=>{
 const query='query($pageId:String!,$siteScope:String!){malaysiaEditorialRecordJson(pageId:$pageId,siteScope:$siteScope)}'
 const records=[]
 for(const scope of ['tio2-my','tio2-a','tio2-b','','unknown']) {
  const response=await request.post('http://127.0.0.1:8186/graphql',{data:{query,variables:{pageId:'APP-COAT',siteScope:scope}}})
  const json=await response.json();expect(json.errors?.length).toBeGreaterThan(0);expect(json.data??null).toBeNull();records.push({scope,status:response.status(),errors:json.errors.map((error:{message:string})=>error.message)})
 }
 for(const scope of ['tio2-a','tio2-b',undefined]) {
  const response=await request.post('http://127.0.0.1:8186/graphql',{headers:{'x-tio2-editorial-token':env.WORDPRESS_EDITORIAL_API_TOKEN},data:{query,variables:{pageId:'APP-COAT',...(scope?{siteScope:scope}:{})}}})
  const json=await response.json();expect(json.errors?.length).toBeGreaterThan(0);expect(json.data??null).toBeNull();records.push({scope:scope??'omitted',authenticated:true,status:response.status(),errors:json.errors.map((error:{message:string})=>error.message)})
 }
 mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'public-api-rejection.json'),JSON.stringify(records,null,2))
})
