/** Owned Next dev + mutable GraphQL fixture integration, not a production build or real WP test. */
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {spawn,execFileSync} from 'node:child_process'
import {createHmac,createHash,randomUUID} from 'node:crypto'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {JSDOM}=require('jsdom')
const original=JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json','utf8'))
let delivered=structuredClone(original),queries=0,logs=''
const fixture=createServer(async(request,response)=>{
 if(request.method!=='POST'||request.url!=='/graphql'){response.writeHead(404).end();return}
 let body='';for await(const chunk of request)body+=chunk
 if(!JSON.parse(body).query.includes('malaysiaRequestSampleRecordJson')){response.writeHead(400).end();return}
 queries++
 const source={id:'owned-runtime-sample-1',modifiedGmt:new Date().toISOString().replace(/Z$/u,''),status:'publish',siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:'/request-sample'},malaysiaRequestSampleContractJson:JSON.stringify(delivered)}
 response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({data:{malaysiaRequestSampleRecordJson:JSON.stringify(source)}}))
})
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)))
const fixturePort=await listen(fixture)
const reservation=createServer();const port=await listen(reservation);await new Promise(resolve=>reservation.close(resolve))
const distDir=`.next-content-runtime-${process.pid}`
const previousNextEnv=existsSync('next-env.d.ts')?readFileSync('next-env.d.ts','utf8'):null
const secret=randomUUID(),base=`http://127.0.0.1:${port}`
const next=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,SITE_ID:'tio2-my',WORDPRESS_GRAPHQL_URL:`http://127.0.0.1:${fixturePort}/graphql`,NEXT_DIST_DIR:distDir,REVALIDATION_SECRET:secret,NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY:'',NEXT_TELEMETRY_DISABLED:'1'},windowsHide:true,stdio:['ignore','pipe','pipe']})
for(const stream of [next.stdout,next.stderr])stream.on('data',chunk=>{logs=(logs+chunk).slice(-20000)})
const readPage=async()=>{const response=await fetch(`${base}/request-sample`,{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200);return response.text()}
const verify=(html,expected)=>{const document=new JSDOM(html).window.document;assert.ok([...document.querySelectorAll('p')].some(p=>p.textContent===expected.hero.body),'rendered paragraph must use CMS text');assert.ok(document.title.includes(expected.seo.title),'title must use CMS SEO');assert.equal(document.querySelector('meta[name="description"]')?.content,expected.seo.description);const graphs=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(script=>JSON.parse(script.textContent)['@graph']??[]);assert.ok(graphs.some(node=>node['@type']==='WebPage'&&node.name===expected.seo.title&&node.description===expected.seo.description),'JSON-LD must use CMS SEO')}
const invalidate=async()=>{const payload={eventId:randomUUID(),siteIds:['tio2-my'],contentId:1,paths:['/request-sample'],entityIds:[],modified:new Date().toISOString(),contentRelease:{releaseId:'owned-runtime',contentSha256:createHash('sha256').update(JSON.stringify(delivered)).digest('hex')}};const body=JSON.stringify(payload);const response=await fetch(`${base}/api/revalidate`,{method:'POST',headers:{'content-type':'application/json','x-tio2-signature':createHmac('sha256',secret).update(body).digest('hex')},body,signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,await response.text())}
try{
 console.log(`Starting owned Next fixture verification on ${base}; PID ${next.pid}`)
 let initial;const deadline=Date.now()+180000
 while(Date.now()<deadline){try{initial=await readPage();break}catch(error){if(next.exitCode!==null)throw error;await new Promise(resolve=>setTimeout(resolve,1000))}}
 assert.ok(initial,'Next did not start');verify(initial,original)
 delivered={...structuredClone(original),hero:{...original.hero,body:'Owned runtime content changed without restarting Next.'},seo:{...original.seo,title:'Owned runtime CMS title',description:'Owned runtime CMS description.'}}
 await invalidate();verify(await readPage(),delivered)
 delivered=structuredClone(original);await invalidate();verify(await readPage(),original)
 assert.equal(next.exitCode,null);assert.ok(queries>=3)
 console.log(JSON.stringify({result:'PASS',mode:'owned-next-dev-graphql-fixture',pid:next.pid,phases:['initial','changed-after-signed-batch','restored-after-signed-batch'],checks:['visible-body','metadata','JSON-LD'],graphqlReads:queries,frontendRestarted:false,productionBuildExecuted:false,sharedWordPressTouched:false}))
}catch(error){console.error(logs);throw error}
finally{if(next.exitCode===null){if(process.platform==='win32')execFileSync('taskkill',['/PID',String(next.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else next.kill('SIGTERM')}await new Promise(resolve=>fixture.close(resolve));const config=readFileSync('tsconfig.json','utf8');const cleaned=config.split('\n').filter(line=>!line.includes(`"${distDir}/`)).join('\n').replace(/,(\r?\n\s*\])/gu,'$1');if(cleaned!==config)writeFileSync('tsconfig.json',cleaned);if(previousNextEnv!==null&&readFileSync('next-env.d.ts','utf8').includes(distDir))writeFileSync('next-env.d.ts',previousNextEnv)}
