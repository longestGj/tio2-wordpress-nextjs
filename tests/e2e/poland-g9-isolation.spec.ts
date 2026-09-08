import {test, expect} from '@playwright/test'
import {execFileSync} from 'node:child_process'
import {createHash, createHmac, randomUUID} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'

// Signed request headers must never enter retained Playwright traces.
test.use({trace: 'off'})

// Opt-in real local CMS tests. A rejected resolver, stale approved-body fallback,
// foreign route exposure, or foreign cache invalidation must fail this suite.
test('Poland live CMS rejects invalid owners and restores the exact baseline', async ({request, page}) => {
  const secret = process.env.POLAND_LOCAL_REVALIDATION_SECRET
  const postId = process.env.POLAND_LOCAL_PROBE_POST_ID
  test.skip(!secret || !postId, 'Explicit local probe ID and local revalidation secret required')
  expect(postId).toMatch(/^[1-9][0-9]*$/)
  const sites = [
    {id: 'tio2-my', base: process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3015'},
    {id: 'tio2-a', base: process.env.POLAND_A_BASE_URL ?? 'http://127.0.0.1:3017'},
    {id: 'tio2-b', base: process.env.POLAND_B_BASE_URL ?? 'http://127.0.0.1:3018'},
  ]
  const graphql = process.env.POLAND_LOCAL_GRAPHQL_URL ?? 'http://127.0.0.1:8080/graphql'
  for (const address of [...sites.map(site => site.base), graphql]) {
    const url = new URL(address)
    expect(['127.0.0.1', 'localhost']).toContain(url.hostname)
    expect(url.protocol).toBe('http:')
    expect(url.username + url.password + url.search + url.hash).toBe('')
  }
  expect(new Set(sites.map(site => new URL(site.base).origin)).size).toBe(3)
  const output = 'docs/verification/tio2-my/market-eu-pl/gate9-fixes-v02/isolation'
  mkdirSync(output, {recursive: true})
  const seed = readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json')
  const sha = createHash('sha256').update(seed).digest('hex')
  const approved = JSON.parse(seed.toString())
  const owner = randomUUID()
  const entries: unknown[] = []
  const record = (entry: Record<string, unknown>) => {
    entries.push({at: new Date().toISOString(), ...entry})
    writeFileSync(`${output}/ledger.json`, JSON.stringify({postId: Number(postId), seedSha256: sha, sites, graphql, entries}, null, 2) + '\n')
  }
  const probe = (mode: string) => {
    const result = JSON.parse(execFileSync('docker', ['compose', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml', 'run', '--rm', '--no-TTY', '--user', '33:33', '-e', 'WP_ENVIRONMENT_TYPE=local', 'wpcli', 'wp', 'eval-file', '/workspace/tests/infrastructure/php/poland-g9-isolation-probe.php', postId!, mode, sha, owner], {encoding: 'utf8', timeout: 30000}).trim())
    record({kind: 'cms-probe', mode, result})
    return result
  }
  const invalidate = async (base: string, siteId: string, state: string) => {
    const payload = {eventId: randomUUID(), siteIds: [siteId], contentId: Number(postId), paths: ['/markets/poland'], entityIds: [], modified: new Date().toISOString()}
    const body = JSON.stringify(payload)
    const response = await request.post(base + '/api/revalidate', {data: body, timeout: 10000, maxRedirects: 0, headers: {'content-type': 'application/json', 'x-tio2-signature': createHmac('sha256', secret!).update(body).digest('hex')}})
    const result = await response.json()
    record({kind: 'revalidation', state, endpoint: base + '/api/revalidate', payload, status: response.status(), result})
    return {status: response.status(), result}
  }
  const invalidateMy = async (state: string) => {
    const result = await invalidate(sites[0].base, 'tio2-my', state)
    expect(result.status).toBe(200)
    expect(result.result.revalidatedTags).toEqual(['content:tio2-my--market--MARKET-EU-PL--en', 'route:tio2-my:/markets/poland'])
  }
  const query = async (state: string) => {
    const payload = {query: 'query GetMalaysiaPolandMarketPage { malaysiaPolandMarketRecordJson }'}
    const response = await request.post(graphql, {data: payload, timeout: 10000, maxRedirects: 0})
    const result = await response.json()
    writeFileSync(`${output}/${state}-graphql.json`, JSON.stringify(result, null, 2) + '\n')
    record({kind: 'graphql', state, endpoint: graphql, payload, status: response.status(), resultFile: `${state}-graphql.json`})
    expect(response.status()).toBe(200)
    return result
  }
  const html = async (base: string, state: string) => {
    let response = await request.get(base + '/markets/poland/', {timeout: 15000, maxRedirects: 0})
    if (base !== sites[0].base) {
      expect(response.status()).toBe(308)
      const target = new URL(response.headers().location, base)
      expect(target.origin).toBe(new URL(base).origin)
      expect(target.pathname).toBe('/markets/poland')
      record({kind:'canonical-redirect',state,url:response.url(),status:response.status(),location:target.href})
      response = await request.get(target.href, {timeout:15000,maxRedirects:0})
    }
    const body = await response.text()
    writeFileSync(`${output}/${state}.html`, body)
    record({kind: 'page-http', state, url: response.url(), status: response.status(), sha256: createHash('sha256').update(body).digest('hex'), htmlFile: `${state}.html`})
    return {status: response.status(), body}
  }
  const restoredHttp = async (state: string) => {
    await expect.poll(async () => {
      const result = await html(sites[0].base, state)
      return result.status === 200 && result.body.includes(approved.modules[1].paragraphs[0]) && result.body.includes(approved.seo.canonical)
    }, {timeout: 25000, intervals: [500, 1000, 2000]}).toBe(true)
  }
  await invalidateMy('preflight') // No backup or mutation before authenticated MY endpoint succeeds.
  const baseline = await query('baseline')
  expect(baseline.errors).toBeUndefined()
  const dto = JSON.parse(baseline.data.malaysiaPolandMarketRecordJson)
  expect(dto.id).toBe(`market-eu-pl-${postId}`)
  expect(dto.siteScopes.nodes).toEqual([{slug: 'tio2-my'}])
  expect(dto.status).toBe('publish')
  expect(createHash('sha256').update(dto.malaysiaPolandMarketContractJson).digest('hex')).toBe(sha)
  await restoredHttp('baseline')
  for (const site of sites) {
    const rejected = await invalidate(site.base, site.id === 'tio2-my' ? 'tio2-a' : 'tio2-my', 'foreign-event')
    expect(rejected.status).toBe(400)
    expect(rejected.result.revalidatedTags ?? []).toEqual([])
    const home = await page.goto(site.base + '/', {waitUntil: 'domcontentloaded', timeout: 20000})
    const identity = await page.evaluate(() => ({
      title: document.title, lang: document.documentElement.lang,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      h1: Array.from(document.querySelectorAll('h1')).map(node => node.textContent),
      header: document.querySelector('header')?.outerHTML ?? null,
      navigation: Array.from(document.querySelectorAll('header a, nav a')).map(node => ({text: node.textContent, href: node.getAttribute('href')})),
      media: Array.from(document.querySelectorAll('img')).map(node => ({src: node.getAttribute('src'), alt: node.alt})),
      forms: Array.from(document.forms).map(node => ({action: node.getAttribute('action'), fields: Array.from(node.elements).map(field => field.getAttribute('name'))})),
      schema: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(node => node.textContent),
    }))
    writeFileSync(`${output}/${site.id}-home.html`, await page.content())
    record({kind: 'home-identity', siteId: site.id, url: page.url(), status: home?.status(), identity})
    expect(home?.status()).toBe(200)
    expect(identity.canonical).toContain(site.id === 'tio2-my' ? 'tio2malaysia.com' : site.id === 'tio2-a' ? 'tio2products.com' : 'tio2hub.com')
    if (site.id !== 'tio2-my') {
      const result = await html(site.base, site.id + '-poland-negative')
      expect(result.status).toBe(404)
      expect(result.body).not.toContain(approved.seo.title)
      expect(result.body).not.toContain(approved.seo.canonical)
      expect(result.body).not.toContain('MARKET-EU-PL')
      expect(result.body).not.toContain('<form')
    }
  }
  let baselineSnapshot: string | undefined
  let backupStarted = false
  try {
    const started = probe('begin')
    backupStarted = true
    baselineSnapshot = started.snapshotSha256
    for (const state of ['missing', 'no-scope', 'wrong-scope', 'multiple-scopes', 'draft', 'malformed']) {
      try {
        probe(state)
        const result = await query(state)
        expect(result.errors?.length).toBeGreaterThan(0)
        expect(result.data?.malaysiaPolandMarketRecordJson ?? null).toBeNull()
        await invalidateMy(state)
        await expect.poll(async () => {
          const result = await html(sites[0].base, state)
          return [404, 500].includes(result.status) && !result.body.includes(approved.modules[1].paragraphs[0]) && !result.body.includes(approved.seo.canonical)
        }, {timeout: 25000, intervals: [500, 1000, 2000]}).toBe(true)
      } finally {
        expect(probe('reset').snapshotSha256).toBe(baselineSnapshot)
        await invalidateMy(state + '-restored')
        await restoredHttp(state + '-restored')
        expect(await query(state + '-restored')).toEqual(baseline)
      }
    }
  } finally {
    if (backupStarted) {
      expect(probe('restore').snapshotSha256).toBe(baselineSnapshot)
      await invalidateMy('finally-restored')
      await restoredHttp('finally-restored')
      expect(await query('finally-restored')).toEqual(baseline)
    }
  }
  record({kind: 'completion', exactBaselineRestored: true, allSixInvalidStatesRejected: true})
})

test.setTimeout(600000)
