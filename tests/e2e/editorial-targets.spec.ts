import {test,expect,type APIRequestContext} from '@playwright/test'
import {execFileSync} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {resolve} from 'node:path'
import {JSDOM} from 'jsdom'
import {getEditorialContract} from './editorial-fixtures'

const base=process.env.TIO2_MY_BASE_URL??'http://127.0.0.1:3216'
const pages=['APP-PAPER','APP-INK'] as const
type Target='GRADE-M350'|'PRODUCT-000'
type Mode='Snapshot'|'Draft'|'Foreign'|'Restore'
interface ProbeResult {target:Target;mode:Mode;postId:number;resolverValid:boolean;status:string;scopes:string[];restored?:boolean}
function probe(target:Target,mode:Mode,runId:string):ProbeResult {
  return JSON.parse(execFileSync('docker',[
    'compose','-p','tio2my9','--env-file','wordpress/.env','-f','.tmp/docker-compose.editorial.yml',
    'run','--rm','wpcli','wp','eval-file','/workspace/tests/infrastructure/php/editorial-target-state.php',target,mode,runId,
  ],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60_000}))
}
async function inspect(request:APIRequestContext,target:Target,available:boolean) {
  const results=[]
  for(const id of pages) {
    const contract=getEditorialContract(id)
    // Keep exactly the same URL between warm, mutation and restoration; no cache busting/revalidation.
    const response=await request.get(base+contract.identity.path)
    expect(response.status(),`${id} remains available`).toBe(200)
    const document=new JSDOM(await response.text()).window.document
    const main=document.querySelector('main')!
    expect(main?.querySelector('h1')?.textContent).toBe(contract.heading)
    const m350=main.querySelectorAll('a[href="/products/m-350/"]').length
    const products=main.querySelectorAll('a[href="/products/"]').length
    expect(m350,`${id} M-350 eligibility`).toBe(available?1:0)
    expect(products,`${id} Product Hub eligibility`).toBe(target==='PRODUCT-000'&&!available?0:1)
    // Neutral Grade identity survives even when its action or required parent is unavailable.
    expect([...main.querySelectorAll('td,th')].some(cell=>cell.textContent?.trim()==='M-350')).toBe(true)
    expect([...main.querySelectorAll('td,th')].some(cell=>cell.textContent?.trim()==='M-2377')).toBe(true)
    const graph=JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph']
    expect(graph.map((node:Record<string,unknown>)=>node['@type'])).toEqual(['WebPage','BreadcrumbList'])
    expect(JSON.stringify(graph)).not.toContain('/products/m-350/')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex')
    results.push({id,status:response.status(),m350Links:m350,productHubLinks:products,neutralGradesPreserved:true,schemaTypes:graph.map((node:Record<string,unknown>)=>node['@type'])})
  }
  return results
}

test.describe.configure({mode:'serial'})
for(const target of ['GRADE-M350','PRODUCT-000'] as const) test(`${target} draft and foreign scope remove warmed Application target links and restore`,async({request})=>{
  test.setTimeout(480_000)
  const url=new URL(base)
  expect(['127.0.0.1','localhost']).toContain(url.hostname)
  expect(url.protocol).toBe('http:')
  expect(url.port).toBe('3216')
  const runId=randomUUID(),output=resolve('docs/verification/tio2-my/trade4-app5-20260908/target-readiness',runId)
  mkdirSync(output,{recursive:true})
  const snapshot=probe(target,'Snapshot',runId),ledger:unknown[]=[]
  let finalRestore:ProbeResult|undefined,finalPages:unknown,error:string|undefined
  try {
    expect(snapshot.resolverValid).toBe(true)
    ledger.push({state:'warm',pages:await inspect(request,target,true)})
    for(const mode of ['Draft','Foreign'] as const) {
      const mutation=probe(target,mode,runId)
      expect(mutation.resolverValid).toBe(false)
      expect(mutation.status).toBe(mode==='Draft'?'draft':'publish')
      expect(mutation.scopes).toEqual(mode==='Foreign'?['tio2-a']:['tio2-my'])
      ledger.push({mode,mutation,pages:await inspect(request,target,false)})
      const restored=probe(target,'Restore',runId)
      expect(restored.restored).toBe(true)
      expect(restored.resolverValid).toBe(true)
      ledger.push({mode:'Restore',restored,pages:await inspect(request,target,true)})
    }
  } catch(cause) {error=String(cause);throw cause}
  finally {
    try {
      finalRestore=probe(target,'Restore',runId)
      expect(finalRestore.restored).toBe(true)
      expect(finalRestore.resolverValid).toBe(true)
      finalPages=await inspect(request,target,true)
    } finally {
      writeFileSync(resolve(output,target+'.json'),JSON.stringify({target,runId,time:new Date().toISOString(),base,snapshot,ledger,error,finalRestore,finalPages,restored:finalRestore?.restored===true&&finalRestore.resolverValid===true},null,2))
    }
  }
})
