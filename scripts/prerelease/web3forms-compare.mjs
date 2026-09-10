import {createHash, randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdir, writeFile} from 'node:fs/promises'
import {readFileSync} from 'node:fs'
import {fileURLToPath, pathToFileURL} from 'node:url'
import path from 'node:path'
import {chromium} from 'playwright'
import {classifyWeb3FormsResponse} from '../../lib/forms/web3forms-provider.ts'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const ENDPOINT = 'https://api.web3forms.com/submit'
const ORIGIN = 'http://127.0.0.1:3100'
const PAGE = ORIGIN + '/__web3forms_compare__'
const UUID = new RegExp(JSON.parse(readFileSync(new URL('../../lib/forms/web3forms-contract.json', import.meta.url), 'utf8')).accessKeyPattern)
const fail = () => { throw new Error('COMPARE_CONFIGURATION_REJECTED') }
const PROCESS_SEND_GUARD = createGuard(true)

export async function reserveToken(base, token) {
  if(typeof token!=='string'||!UUID.test(token)) fail()
  const ledger=path.join(base,'used-tokens')
  await mkdir(ledger,{recursive:true})
  await writeFile(path.join(ledger,token.toLowerCase()),'reserved\n',{flag:'wx'})
}

export function parseOptions(args, key) {
  if (typeof key !== 'string' || !UUID.test(key)) fail()
  const options = {send:false, transport:'multipart', requestToken:randomUUID()}
  const seen = new Set()
  for (let i=0; i<args.length; i++) {
    const flag = args[i]
    if (seen.has(flag)) fail()
    seen.add(flag)
    if (flag === '--send') options.send = true
    else if (flag === '--transport') options.transport = args[++i]
    else if (flag === '--request-token') options.requestToken = args[++i]
    else fail()
  }
  if (!['multipart','json'].includes(options.transport) || typeof options.requestToken !== 'string' || !UUID.test(options.requestToken)) fail()
  if (options.send && (!seen.has('--transport') || !seen.has('--request-token'))) fail()
  return options
}

export function keySummary(key, runtime) {
  return {present:typeof key === 'string' && key.length>0, uuidShape:typeof key === 'string' && UUID.test(key),
    fingerprint:createHash('sha256').update(key ?? '').digest('hex'), runtimeMatches:runtime === key}
}

export function syntheticFields(token) {
  return {full_name:'AUTHORIZED DIAGNOSTIC TEST', company:'Diagnostic only', email:'documents-compare@example.com',
    subject:'[LOCAL PRERELEASE] Documents transport comparison - no fulfilment', from_name:'TiO2 Malaysia Diagnostics',
    site_scope:'tio2-my', page_id:'CONV-DOC', workflow_type:'documents', locale:'en', request_token:token}
}

export function createGuard(send) {
  let count=0
  return {get externalPostCount(){return count}, reserve(method,url) {
    if (!send || count!==0 || method!=='POST' || url!==ENDPOINT) return false
    count++ // Reserve synchronously before any asynchronous network operation.
    return true
  }}
}

export async function inspectRequest(body, contentType, transport, key, token) {
  const expected = {...syntheticFields(token), access_key:key}
  let entries=[]
  const category = contentType?.split(';')[0].trim().toLowerCase()
  try {
    if (transport==='json' && category==='application/json') {
      const parsed=JSON.parse(body)
      if (parsed && typeof parsed==='object' && !Array.isArray(parsed)) entries=Object.entries(parsed)
    } else if (transport==='multipart' && category==='multipart/form-data') {
      entries=[...(await new Request(ENDPOINT,{method:'POST',headers:{'content-type':contentType},body}).formData()).entries()]
    }
  } catch { /* Do not expose parser messages or input. */ }
  const actual=Object.fromEntries(entries)
  const valid=entries.length===Object.keys(expected).length && entries.every(([name,value])=>Object.hasOwn(expected,name)&&expected[name]===value)
    && new Set(entries.map(([name])=>name)).size===entries.length
  return {valid, key:keySummary(key,actual.access_key), contentType:['application/json','multipart/form-data'].includes(category)?category:'other',
    // Never persist unexpected field names: hostile names can contain personal data.
    fieldNames:entries.map(([name])=>name).filter(name=>Object.hasOwn(expected,name)).sort()}
}

export function createPostGate(options, key, result, event, guard) {
  let seen=0
  let valid=false
  return {get validated(){return valid}, async handle(route) {
    const request=route.request()
    seen++
    event('request_intercepted')
    if(seen!==1) {result.blockedWriteCount++;event('second_post_blocked');return route.abort()}
    const inspected=await inspectRequest(request.postData()??'',request.headers()['content-type'],options.transport,key,options.requestToken)
    Object.assign(result,{method:'POST',contentType:inspected.contentType,fieldNames:inspected.fieldNames,key:inspected.key})
    valid=inspected.valid && request.method()==='POST' && request.url()===ENDPOINT
    if(!valid) {event('payload_rejected');return route.abort()}
    if(!guard.reserve(request.method(),request.url())) {event(options.send?'process_post_limit_blocked':'dry_run_post_blocked');if(options.send)result.blockedWriteCount++;return route.abort()}
    result.externalPostCount=guard.externalPostCount
    result.externalRequestCount++
    event('post_released')
    return route.continue()
  }}
}

export async function runComparison(options, key) {
  // Also validate programmatic callers, not only CLI parsing.
  parseOptions(['--transport',options.transport,'--request-token',options.requestToken,...(options.send?['--send']:[])],key)
  if(options.send) await reserveToken(path.join(ROOT,'.local-evidence','web3forms-compare'),options.requestToken)
  const start=Date.now()
  const result={schemaVersion:1, status:'INCOMPLETE', commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
    buildId:null, runtimeSource:'isolated-diagnostic-page-route', browser:'Chrome', browserVersion:null, headless:false, origin:ORIGIN,
    transport:options.transport, mode:options.send?'send':'dry-run', requestToken:options.requestToken,
    externalPostCount:0, externalRequestCount:0, blockedWriteCount:0, method:null, endpointHost:'api.web3forms.com',
    contentType:null, fieldNames:[], key:keySummary(key,undefined), events:[], httpStatus:null, mediaType:null,
    parsedSuccess:null, providerCategory:'not_tested', elapsedMs:0}
  const guard=options.send?PROCESS_SEND_GUARD:createGuard(false)
  let browser
  let fatal=false
  const event=(type)=>{if(result.events.length<30)result.events.push({type,elapsedMs:Date.now()-start})}
  const postGate=createPostGate(options,key,result,event,guard)
  try {
    browser=await chromium.launch({channel:'chrome',headless:false})
    result.browserVersion=browser.version()
    const context=await browser.newContext({serviceWorkers:'block'})
    // Block redirects at fetch level: Playwright route does not intercept every redirect hop.
    // All other page traffic is blocked, including navigations and business routes.
    await context.route('**/*',async route=>{
      const request=route.request()
      try {
        if(request.method()==='GET' && request.url()===PAGE) return await route.fulfill({contentType:'text/html',body:'<!doctype html><title>Web3Forms transport diagnostic</title><h1>Documents transport diagnostic</h1><p>Controlled synthetic input. No business request.</p><form></form>'})
        if(request.method()==='OPTIONS' && request.url()===ENDPOINT) {
          event('preflight_intercepted')
          if(options.send) {result.externalRequestCount++;return await route.continue()}
          return await route.fulfill({status:204,headers:{'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'POST','access-control-allow-headers':'content-type'}})
        }
        if(request.method()==='POST' && request.url()===ENDPOINT) {
          return await postGate.handle(route)
        }
        if(!['GET','HEAD','OPTIONS'].includes(request.method())) result.blockedWriteCount++
        return await route.abort()
      } catch {fatal=true;event('interception_failure');await route.abort().catch(()=>{})}
    })
    const page=await context.newPage()
    page.on('requestfailed',request=>{if(request.url()===ENDPOINT)event('request_failed')})
    page.on('response',response=>{if(response.url()===ENDPOINT){event('response_headers');result.httpStatus=response.status()}})
    await page.goto(PAGE)
    // Values live only in this transient browser context; no trace, HAR, screenshots or console logging.
    const observed=await page.evaluate(async ({key,fields,transport,endpoint})=>{
      const form=document.querySelector('form')
      for(const [name,value] of Object.entries(fields)) {
        const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input)
      }
      const data=new FormData(form)
      data.set('access_key',key)
      const controller=new AbortController()
      const timer=setTimeout(()=>controller.abort(),12000)
      try {
        const response=await fetch(endpoint,{method:'POST',redirect:'error',signal:controller.signal,
          ...(transport==='json'?{headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(data))}:{body:data})})
        const media=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()??null
        const jsonMedia=media==='application/json'||media?.endsWith('+json')
        let success=null
        let category='unexpected'
        if(jsonMedia) {
          try {
            const body=await response.json()
            success=typeof body?.success==='boolean'?body.success:null
            // Body/message never cross the browser boundary.
            category=response.status===200?(success===true?'accepted':success===false?'rejected':'unexpected'):
              [400,422].includes(response.status)?'unknown_invalid_request':response.status===429?'rate_limited':'unexpected'
          } catch {category=controller.signal.aborted?'timeout':'invalid_json'}
        }
        return {status:response.status,media:jsonMedia?'application/json':media==='text/html'?'text/html':'other',success,category}
      } catch {return {status:null,media:null,success:null,category:controller.signal.aborted?'timeout':'network'}}
      finally {clearTimeout(timer)}
    },{key,fields:syntheticFields(options.requestToken),transport:options.transport,endpoint:ENDPOINT})
    if(options.send) {
      result.httpStatus=observed.status??result.httpStatus
      result.mediaType=observed.media
      result.parsedSuccess=observed.success
      result.providerCategory=observed.category==='accepted'||observed.category==='rejected'
        ?classifyWeb3FormsResponse(observed.status,{success:observed.success}):observed.category
      event('response_or_failure_completed')
    }
    result.status=postGate.validated&&!fatal&&result.blockedWriteCount===0
      ?options.send?(result.providerCategory==='accepted'?'PROVIDER_ACCEPTED_NOT_INBOX_CONFIRMED':'SUBMISSION_NOT_CONFIRMED'):'DRY_RUN_VALIDATED':'FAILED'
  } catch {event('runner_failure');result.status='FAILED'}
  finally {if(browser)await browser.close().catch(()=>{result.status='FAILED'});result.elapsedMs=Date.now()-start}
  return result
}

async function main() {
  const key=process.env.NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY
  const options=parseOptions(process.argv.slice(2),key)
  const base=path.join(ROOT,'.local-evidence','web3forms-compare')
  await mkdir(base,{recursive:true})
  const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()
  const dir=path.join(base,runId);await mkdir(dir)
  const result=await runComparison(options,key)
  await writeFile(path.join(dir,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
  process.stdout.write(JSON.stringify({status:result.status,externalPostCount:result.externalPostCount,evidence:path.join(dir,'result.json')})+'\n')
  if(!['DRY_RUN_VALIDATED','PROVIDER_ACCEPTED_NOT_INBOX_CONFIRMED'].includes(result.status))process.exitCode=1
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(()=>{process.stderr.write('COMPARE_FAILED: configuration, token, browser or evidence unavailable; sensitive details suppressed.\n');process.exitCode=1})
}
