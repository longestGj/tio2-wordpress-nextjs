import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {spawnSync} from 'node:child_process'
import test from 'node:test'
import {JSDOM} from 'jsdom'

const root=resolve(import.meta.dirname,'../..')
const configs=resolve(root,'wordpress/plugins/tio2-site-model/config')

test('alternative payloads preserve all approved buyer copy and freeze identity',async()=>{
  const result=spawnSync(process.execPath,['scripts/editorial/build-alternative-payloads.mjs','--check'],{cwd:root,encoding:'utf8'})
  assert.equal(result.status,0,result.stdout+result.stderr)
})

for(const pageId of ['RES-R706','RES-CHEMOURS']) test(`${pageId} preserves neutral owner actions and does not publish candidate SEO`,async()=>{
  const payload=JSON.parse(await readFile(resolve(configs,`tio2-my-editorial-${pageId.toLowerCase()}.json`),'utf8'))
  const document=new JSDOM(payload.bodyHtml).window.document
  assert.equal(payload.identity.siteScope,'tio2-my')
  assert.equal(payload.identity.provisional,true)
  assert.equal(payload.seo.canonical,null)
  assert.equal(payload.seo.schemaType,'none')
  assert.equal(payload.freshness.lastReviewed,'2026-09-06')
  assert.equal(document.querySelectorAll('section').length,6)
  const links=[...document.querySelectorAll('a')].map(a=>a.getAttribute('href'))
  assert.ok(links.includes('/products/'))
  assert.ok(links.includes('/request-documents/'))
  assert.ok(links.every(href=>!href.includes('?')&&!/^\/products\/m-/u.test(href)))
  assert.equal(document.querySelectorAll('form,script,header,footer,img').length,0)
  if(pageId==='RES-R706') {
    assert.ok(links.includes('/request-sample/'))
    assert.equal(document.querySelector('#evaluation-brief')?.getAttribute('tabindex'),'-1')
    assert.match(document.body.textContent,/93 wt% minimum/u)
    assert.match(document.body.textContent,/typical unless otherwise specified/u)
  } else {
    assert.ok(!links.includes('/request-sample/'))
    assert.ok(!document.body.textContent.includes('R-706'))
  }
})
