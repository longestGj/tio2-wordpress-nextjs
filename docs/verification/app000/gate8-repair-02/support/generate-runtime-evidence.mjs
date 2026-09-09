import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {chromium} from '@playwright/test'

throw new Error('Superseded by tests/e2e/app000-gate8.spec.ts under the approved browser-direct contract. Historical evidence must not be overwritten.')

const baseUrl = process.env.APP000_BASE_URL ?? 'http://127.0.0.1:4391'
const receiverUrl = process.env.APP000_RFQ_RECEIVER_URL ?? 'http://127.0.0.1:4392'
const out = new URL('../runtime/', import.meta.url)
mkdirSync(out, {recursive: true})
const contract = JSON.parse(readFileSync(new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json', import.meta.url), 'utf8'))
const checkedAt = new Date().toISOString()
const internalMarker = /APP-000|APP000-EDGE-[A-Z0-9-]+|TIO2MY-[A-Z0-9-]+|(?:PRODUCT|MARKET|RES|CONV|GLOBAL|LEGAL)-[A-Z0-9][A-Z0-9-]*|data-(?:site-id|site-scope|source-page|page-id|grade-occurrence|grade-state|support-action|application-action|module)|["']?(?:currentPageId|sourcePageId|targetPageId|siteScope|edgeId|contractId|packageId|reviewId|auditId)["']?\s*[:=]|(?:site_scope|page_id|source_page_id)\s*[:=]|\/api\/tio2-my/gu
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const matches = (value) => [...new Set(value.match(internalMarker) ?? [])]

async function capturePublicBoundary(browserPage, path) {
  const rawHtmlResponse = await fetch(new URL(path, baseUrl), {headers: {accept: 'text/html'}})
  const rawRscResponse = await fetch(new URL(path, baseUrl), {headers: {accept: 'text/x-component', rsc: '1'}})
  const rawHtml = await rawHtmlResponse.text()
  const rawRsc = await rawRscResponse.text()
  const projection = await browserPage.evaluate(() => ({
    dom: document.documentElement.outerHTML,
    head: document.head.outerHTML,
    schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => node.textContent ?? '').join('\n'),
    inlineScripts: [...document.scripts].filter((node) => !node.src).map((node) => node.textContent ?? '').join('\n'),
    scriptUrls: [...new Set([...document.scripts].map((node) => node.src).filter(Boolean))],
    browserState: JSON.stringify({local: {...localStorage}, session: {...sessionStorage}, history: history.state}),
  }))
  const loadedClientScripts = []
  for (const url of projection.scriptUrls) {
    const body = await (await fetch(url)).text()
    loadedClientScripts.push({
      path: new URL(url).pathname,
      status: 200,
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
      internalMarkerMatches: matches(body),
    })
  }
  const aria = await browserPage.locator('body').ariaSnapshot()
  const surface = (value, status = 200, contentType = null) => ({
    status, contentType, bytes: Buffer.byteLength(value), sha256: sha256(value), internalMarkerMatches: matches(value),
  })
  return {
    path,
    html: surface(rawHtml, rawHtmlResponse.status, rawHtmlResponse.headers.get('content-type')),
    rsc: surface(rawRsc, rawRscResponse.status, rawRscResponse.headers.get('content-type')),
    dom: surface(projection.dom),
    head: surface(projection.head),
    schema: surface(projection.schema),
    accessibility: surface(aria),
    inlineScripts: surface(projection.inlineScripts),
    browserState: surface(projection.browserState),
    loadedClientScripts,
  }
}

const browser = await chromium.launch({headless: true})
const page = await browser.newPage({viewport: {width: 1440, height: 1000}})
const response = await page.goto(`${baseUrl}/applications/`, {waitUntil: 'networkidle'})
if (response?.status() !== 200) throw new Error(`application hub returned ${response?.status()}`)

const projection = await page.evaluate(() => ({
  title: document.title,
  lang: document.documentElement.lang,
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  robots: document.querySelector('meta[name="robots"]')?.content,
  headings: [...document.querySelectorAll('main h1, main h2')].map((node) => node.textContent?.trim()),
  gradeOccurrences: [...document.querySelectorAll('#application-selector article')].flatMap((article) => (
    [...article.querySelectorAll('details li')].map((node, index) => ({
      application: article.querySelector('h3')?.textContent?.trim(),
      position: index + 1,
      label: node.textContent?.trim(),
      state: node.querySelector('a') ? 'linked' : 'plain',
      href: node.querySelector('a')?.getAttribute('href') ?? null,
    }))
  )),
  childActions: [...document.querySelectorAll('main a[href^="/applications/titanium-dioxide-for-"]')].map((node) => ({label: node.textContent?.trim(), href: node.getAttribute('href')})),
  supportActions: ['Explore Products', 'Review Documents', 'Explore Markets'].map((label) => ({
    label,
    href: [...document.querySelectorAll('main a')].find((node) => node.childNodes[0]?.textContent?.trim() === label)?.getAttribute('href') ?? null,
  })),
  categoryAccessibleNames: [...document.querySelectorAll('nav[aria-label="Choose an Application"] a')].map((node) => node.textContent?.replace(/[↓→]/gu, '').trim()),
  rfqBodyLinks: [...document.querySelectorAll('main a[href="/request-a-quote/"]')].map((node) => ({label: node.textContent?.trim(), href: node.getAttribute('href')})),
  currentNavigation: document.querySelector('nav[aria-label="Primary navigation"] [aria-current="page"]')?.textContent?.trim(),
  horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  schema: JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'),
}))

const appPublicBoundary = await capturePublicBoundary(page, '/applications/')
const publicSurfaceScan = {
  html: {...appPublicBoundary.html, matches: appPublicBoundary.html.internalMarkerMatches},
  rsc: {...appPublicBoundary.rsc, matches: appPublicBoundary.rsc.internalMarkerMatches},
}

const uniqueRoutes = [...new Set(contract.routeRegistry.map((route) => route.href))]
const routeResults = []
for (const path of uniqueRoutes) {
  const initial = await fetch(new URL(path, baseUrl), {redirect: 'manual'})
  const result = await fetch(new URL(path, baseUrl))
  routeResults.push({path, initialStatus: initial.status, status: result.status, finalUrl: result.url})
}
const routeByPath = Object.fromEntries(routeResults.map((item) => [item.path, item.status]))
let occurrenceIndex = 0
const gradeEdges = contract.applications.flatMap((application) => application.grades.map((grade, index) => {
  const actual = projection.gradeOccurrences[occurrenceIndex++]
  return {
    edgeId: grade.edgeId,
    applicationKey: application.key,
    position: index + 1,
    label: grade.gradeId,
    targetPageId: grade.targetPageId,
    expectedHref: grade.href,
    renderedState: actual?.state ?? 'missing',
    renderedHref: actual?.href ?? null,
    targetStatus: routeByPath[grade.href] ?? null,
  }
}))

const responsiveStates = []
for (const viewport of [{name: 'desktop-1440', width: 1440, height: 1000}, {name: 'tablet-768', width: 768, height: 1024}, {name: 'mobile-390', width: 390, height: 844}]) {
  await page.setViewportSize(viewport)
  await page.goto(`${baseUrl}/applications/`, {waitUntil: 'networkidle'})
  const defaults = await page.locator('#application-selector details').evaluateAll((nodes) => nodes.map((node) => node.open))
  if (viewport.width === 390) {
    await page.locator('#application-selector details summary').nth(0).click()
    await page.locator('#application-selector details summary').nth(1).focus()
    await page.keyboard.press('Enter')
  }
  responsiveStates.push({viewport, defaultOpen: defaults, firstTwoOpenAfterPointerAndKeyboard: viewport.width === 390
    ? await page.locator('#application-selector details').evaluateAll((nodes) => nodes.slice(0, 2).map((node) => node.open))
    : null})
}

const consumers = [
  ['RES-TRADE-EU', '/resources/eu-titanium-dioxide-anti-dumping-duty/'],
  ['RES-TRADE-UK', '/resources/uk-titanium-dioxide-anti-dumping-investigation/'],
  ['RES-TRADE-IN', '/resources/india-titanium-dioxide-anti-dumping-duty/'],
  ['RES-TRADE-BR', '/resources/brazil-titanium-dioxide-anti-dumping-duty/'],
  ['APP-COAT', '/applications/titanium-dioxide-for-coatings/'],
  ['APP-PLAS', '/applications/titanium-dioxide-for-plastics/'],
  ['APP-MB', '/applications/titanium-dioxide-for-masterbatch/'],
  ['APP-INK', '/applications/titanium-dioxide-for-printing-inks/'],
  ['APP-PAPER', '/applications/titanium-dioxide-for-paper/'],
  ['PRODUCT-PROC-CL', '/products/chloride-process-titanium-dioxide/'],
  ['PRODUCT-PROC-SU', '/products/sulfate-process-titanium-dioxide/'],
]
const consumerResults = []
for (const [pageId, path] of consumers) {
  const result = await fetch(new URL(path, baseUrl))
  const body = await result.text()
  consumerResults.push({pageId, path, status: result.status, applicationsHrefInstances: (body.match(/href="\/applications\/?"/gu) ?? []).length})
}

await fetch(`${receiverUrl}/reset`, {method: 'POST'})
const rfqPage = await browser.newPage()
await rfqPage.goto(`${baseUrl}/applications/`, {waitUntil: 'networkidle'})
const attributionResponsePromise = rfqPage.waitForResponse((item) => item.url().endsWith('/api/rfq/context'))
await rfqPage.locator('main').getByRole('link', {name: 'Request a Quote'}).first().click()
const attributionResponse = await attributionResponsePromise
await rfqPage.waitForURL((url) => url.pathname === '/request-a-quote' && !url.search)
const attributionCookie = (await rfqPage.context().cookies()).find(({name}) => name === 'rfq_context')
const handoffState = await rfqPage.evaluate(() => ({
  cleanUrl: `${location.origin}${location.pathname}`,
  search: location.search,
  gradeValue: document.querySelector('#rfq-grade_id')?.value,
  applicationValue: document.querySelector('#rfq-application_id')?.value,
}))
await rfqPage.locator('#rfq-grade_id').selectOption('M-350')
await rfqPage.locator('#rfq-application_id').selectOption('Coatings')
await rfqPage.locator('#rfq-quantity_mt').fill('12')
await rfqPage.locator('#rfq-destination_country').fill('Malaysia')
await rfqPage.locator('#rfq-company_name').fill('Gate 8 Repair Test Company')
await rfqPage.locator('#rfq-contact_name').fill('Gate 8 Repair Tester')
await rfqPage.locator('#rfq-business_email').fill('gate8-repair@example.com')
const rfqPublicBoundary = await capturePublicBoundary(rfqPage, '/request-a-quote/')
const submissionResponsePromise = rfqPage.waitForResponse((item) => item.url().endsWith('/api/rfq/submit'))
await rfqPage.getByRole('button', {name: 'REQUEST QUOTE'}).click()
const submissionResponse = await submissionResponsePromise
await rfqPage.getByText('Something went wrong while submitting your request.').waitFor()
const {payload: submittedPayload} = await (await fetch(`${receiverUrl}/capture`)).json()
const publicApiEvidence = [
  attributionResponse.url(), JSON.stringify(await attributionResponse.allHeaders()),
  submissionResponse.url(), JSON.stringify(await submissionResponse.allHeaders()), await submissionResponse.text(),
].join('\n')
const rfqHandoff = {
  checkedAt,
  baseUrl,
  transport: 'server-to-local-receiver-simulation',
  receiverRequestSentExternally: false,
  attributionStatus: attributionResponse.status(),
  submissionStatus: submissionResponse.status(),
  cookie: attributionCookie ? {name: attributionCookie.name, httpOnly: attributionCookie.httpOnly, sameSite: attributionCookie.sameSite, opaque: !attributionCookie.value.includes('APP-000')} : null,
  publicApiInternalMarkerMatches: matches(publicApiEvidence),
  ...handoffState,
  submittedPayload,
  accessKeyExcluded: submittedPayload !== null && !Object.hasOwn(submittedPayload, 'access_key'),
}

writeFileSync(new URL('runtime-contract.json', out), JSON.stringify({checkedAt, baseUrl, status: response.status(), buildId: process.env.APP000_BUILD_ID, implementationCommit: process.env.APP000_IMPLEMENTATION_COMMIT, projection, publicSurfaceScan}, null, 2) + '\n')
writeFileSync(new URL('route-matrix.json', out), JSON.stringify({checkedAt, baseUrl, routes: routeResults}, null, 2) + '\n')
writeFileSync(new URL('grade-edge-inventory.json', out), JSON.stringify({checkedAt, expectedCounts: [8, 8, 7, 4, 2, 1], total: gradeEdges.length, edges: gradeEdges}, null, 2) + '\n')
writeFileSync(new URL('responsive-state-matrix.json', out), JSON.stringify({checkedAt, states: responsiveStates}, null, 2) + '\n')
writeFileSync(new URL('consumer-regression-matrix.json', out), JSON.stringify({checkedAt, baseUrl, authority: 'read-only', consumers: consumerResults}, null, 2) + '\n')
writeFileSync(new URL('shared-instance-map.json', out), JSON.stringify({checkedAt, currentNavigation: projection.currentNavigation, breadcrumb: ['Home', 'Applications'], categoryAccessibleNames: projection.categoryAccessibleNames, supportActions: projection.supportActions, rfqBodyLinks: projection.rfqBodyLinks, childActions: projection.childActions}, null, 2) + '\n')
writeFileSync(new URL('rfq-private-handoff.json', out), JSON.stringify(rfqHandoff, null, 2) + '\n')
writeFileSync(new URL('public-boundary-scan.json', out), JSON.stringify({
  checkedAt,
  marker: internalMarker.source,
  app: appPublicBoundary,
  rfq: rfqPublicBoundary,
  publicApiInternalMarkerMatches: matches(publicApiEvidence),
}, null, 2) + '\n')
await browser.close()
const boundaryMatches = [appPublicBoundary, rfqPublicBoundary].flatMap((entry) => [
  entry.html, entry.rsc, entry.dom, entry.head, entry.schema, entry.accessibility, entry.inlineScripts, entry.browserState,
  ...entry.loadedClientScripts,
]).flatMap((entry) => entry.internalMarkerMatches)
if (boundaryMatches.length || matches(publicApiEvidence).length) throw new Error(`public boundary contains internal identities: ${JSON.stringify([...boundaryMatches, ...matches(publicApiEvidence)])}`)
process.stdout.write(JSON.stringify({status: 'passed', checkedAt, gradeEdges: gradeEdges.length, routes: routeResults.length, consumers: consumerResults.length, appClientScripts: appPublicBoundary.loadedClientScripts.length, rfqClientScripts: rfqPublicBoundary.loadedClientScripts.length, publicBoundaryMatches: 0}))
