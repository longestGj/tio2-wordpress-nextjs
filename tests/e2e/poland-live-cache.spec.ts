import {requiredLocalUrl} from './support/required-local-url'
import {wordpressComposeArgs} from '../helpers/wordpress-compose'

import {test,expect} from '@playwright/test'
import {execFileSync} from 'node:child_process'
import {createHash,createHmac,randomUUID} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-mutating', hostHttp: false, serialMutationAuthorized: true} as const
const composeArgs = wordpressComposeArgs({...WORDPRESS_RUNTIME_MODE, runId: 'poland-live-cache'}, {})
const base=requiredLocalUrl('TIO2_MY_BASE_URL').origin
const secret=process.env.POLAND_LOCAL_REVALIDATION_SECRET
const postId=process.env.POLAND_LOCAL_PROBE_POST_ID
const evidence=process.env.POLAND_EVIDENCE_DIR??'docs/verification/tio2-my/market-eu-pl/runtime'
test.use({trace:'off'})
test('real WordPress edit invalidates Poland HTTP cache and restores approved copy',async({request})=>{
  if (!secret || !postId) throw new Error('POLAND_LOCAL_PROBE_POST_ID and POLAND_LOCAL_REVALIDATION_SECRET are required')
  const url=new URL(base)
  expect(['127.0.0.1','localhost']).toContain(url.hostname);expect(url.protocol).toBe('http:')
  const seed=readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json')
  const sha=createHash('sha256').update(seed).digest('hex')
  const original=JSON.parse(seed.toString()).modules[1].paragraphs[0] as string
  const changed='Temporary local Poland HTTP cache verification.'
  const invalidate=async(siteIds=['tio2-my'])=>{
    const body=JSON.stringify({eventId:randomUUID(),siteIds,contentId:Number(postId),paths:['/markets/poland'],entityIds:[],modified:new Date().toISOString()})
    return request.post(base+'/api/revalidate',{data:body,headers:{'content-type':'application/json','x-tio2-signature':createHmac('sha256',secret!).update(body).digest('hex')}})
  }
  const preflight=await invalidate();expect(preflight.status()).toBe(200)
  const receipt=await preflight.json()
  expect(receipt.revalidatedTags).toEqual(['content:tio2-my--market--MARKET-EU-PL--en','route:tio2-my:/markets/poland'])
  const foreign=await invalidate(['tio2-a']);expect(foreign.status()).toBe(400)
  const write=(mode:'edit'|'restore')=>JSON.parse(execFileSync('docker',[...composeArgs,'run','--rm','--no-deps','--no-TTY','--user','33:33','-e','WP_ENVIRONMENT_TYPE=local','wpcli','wp','eval-file','/workspace/tests/infrastructure/php/poland-http-probe.php',postId,mode,sha],{encoding:'utf8',timeout:30000,windowsHide:true}).trim())
  const body=async()=>{const r=await request.get(base+'/markets/poland/');expect(r.status()).toBe(200);return r.text()}
  try {
    write('edit')
    expect((await invalidate()).status()).toBe(200)
    await expect.poll(body,{timeout:20000}).toContain(changed)
  } finally {
    expect(write('restore').sha256).toBe(sha)
    expect((await invalidate()).status()).toBe(200)
    await expect.poll(body,{timeout:20000}).toContain(original)
    expect(await body()).not.toContain(changed)
  }
  mkdirSync(evidence,{recursive:true})
  writeFileSync(`${evidence}/live-cache.json`,JSON.stringify({checkedAt:new Date().toISOString(),base,postId:Number(postId),editedHttpVisible:true,originalRestored:true,sha256:sha,revalidatedTags:receipt.revalidatedTags,foreignScopeEventStatus:foreign.status()},null,2)+'\n')
})
test.setTimeout(90000)
