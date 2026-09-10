import {describe, it, expect} from 'vitest'
import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {parseOptions, createGuard, createPostGate, reserveToken, inspectRequest, syntheticFields, keySummary, runComparison} from '../../scripts/prerelease/web3forms-compare.mjs'

const key = '12345678-1234-1234-1234-123456789abc'
const token = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const endpoint = 'https://api.web3forms.com/submit'
describe('Web3Forms compare safety', () => {
  it('defaults to dry-run and rejects missing key, invalid token and incomplete send', () => {
    expect(parseOptions(['--transport','json'], key).send).toBe(false)
    for (const args of [['--send'], ['--send','--transport','json'], ['--request-token','bad'], ['--send','--transport','xml']]) {
      expect(() => parseOptions(args, key)).toThrow()
    }
    for (const bad of [undefined, '', 'bad', key+'\n']) expect(() => parseOptions([], bad)).toThrow()
  })
  it('never permits POST in dry-run and blocks all second/foreign writes', () => {
    const dry = createGuard(false)
    expect(dry.reserve('POST', endpoint)).toBe(false)
    expect(dry.externalPostCount).toBe(0)
    const live = createGuard(true)
    expect(live.reserve('POST', endpoint + '?extra')).toBe(false)
    expect(live.reserve('POST', endpoint)).toBe(true)
    expect(live.reserve('POST', endpoint)).toBe(false)
    expect(live.reserve('POST', 'https://example.com')).toBe(false)
    expect(live.externalPostCount).toBe(1)
  })
  it.each(['json','multipart'])('validates actual %s encoding and key without echoing values', async transport => {
    const fields = {...syntheticFields(token), access_key:key}
    const form = new FormData()
    for (const [name,value] of Object.entries(fields)) form.set(name,value)
    const req = new Request(endpoint, {method:'POST', ...(transport==='json' ? {headers:{'content-type':'application/json'},body:JSON.stringify(fields)} : {body:form})})
    const result = await inspectRequest(await req.text(), req.headers.get('content-type'), transport, key, token)
    expect(result.valid).toBe(true)
    expect(result.key.runtimeMatches).toBe(true)
    expect(JSON.stringify(result)).not.toContain(key)
    expect(JSON.stringify(result)).not.toContain(fields.email)
    expect((await inspectRequest('{}', 'application/json', transport, key, token)).valid).toBe(false)
  })
  it('only exposes allowed key metadata', () => {
    expect(Object.keys(keySummary(key, key)).sort()).toEqual(['fingerprint','present','runtimeMatches','uuidShape'])
  })
  it('atomically rejects duplicate/case-variant tokens, including concurrent attempts', async () => {
    const dir=await mkdtemp(path.join(tmpdir(),'web3forms-token-'))
    try {
      const results=await Promise.allSettled([reserveToken(dir,token),reserveToken(dir,token.toUpperCase())])
      expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
      await expect(reserveToken(dir,token)).rejects.toThrow()
    } finally {await rm(dir,{recursive:true,force:true})}
  })
  it.each([false,true])('actual POST routing handler enforces send=%s and blocks concurrent second POST offline',async send=>{
    const result={externalPostCount:0,externalRequestCount:0,blockedWriteCount:0}
    let continued=0, aborted=0
    // No browser or network: exercise the actual routing handler with an in-memory route sink.
    const route={request:()=>({method:()=> 'POST',url:()=>endpoint,headers:()=>({'content-type':'application/json'}),postData:()=>JSON.stringify({...syntheticFields(token),access_key:key})}),
      continue:async()=>{continued++},abort:async()=>{aborted++}}
    const gate=createPostGate({send,transport:'json',requestToken:token},key,result,()=>{},createGuard(send))
    await Promise.all([gate.handle(route),gate.handle(route)])
    expect(continued).toBe(send?1:0)
    expect(aborted).toBe(send?1:2)
    expect(result.externalPostCount).toBe(send?1:0)
    expect(result.blockedWriteCount).toBe(1)
  })
  it.each(['multipart','json'])('visible Chrome %s dry-run has zero external requests and sanitized evidence', async transport => {
    const result = await runComparison(parseOptions(['--transport',transport], key), key)
    expect(result.status).toBe('DRY_RUN_VALIDATED')
    expect(result.externalPostCount).toBe(0)
    expect(result.externalRequestCount).toBe(0)
    expect(result.key.runtimeMatches).toBe(true)
    expect(result.headless).toBe(false)
    expect(result.fieldNames).toEqual(Object.keys({...syntheticFields(result.requestToken),access_key:key}).sort())
    const text = JSON.stringify(result)
    for (const secret of [key, 'documents-compare@example.com', 'cookie', 'session', 'access_key":"']) expect(text).not.toContain(secret)
  }, 30000)
})
