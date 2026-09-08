import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {chromium} from '@playwright/test'

const baseUrl = process.env.APP000_BASE_URL ?? 'http://127.0.0.1:4391'
const out = new URL('../runtime/', import.meta.url)
mkdirSync(out, {recursive: true})
const contract = JSON.parse(readFileSync(new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json', import.meta.url), 'utf8'))
const checkedAt = new Date().toISOString()
const browser = await chromium.launch({headless: true})
const page = await browser.newPage({viewport: {width: 1440, height: 1000}})
const response = await page.goto(`${baseUrl}/applications/`, {waitUntil: 'networkidle'})
if (response?.status() !== 200) throw new Error(`APP-000 returned ${response?.status()}`)
const projection = await page.evaluate(() => ({
  title: document.title,
  lang: document.documentElement.lang,
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  robots: document.querySelector('meta[name="robots"]')?.content,
  modules: [...document.querySelectorAll('[data-module]')].map((node) => node.dataset.module),
  gradeOccurrences: [...document.querySelectorAll('[data-grade-occurrence]')].map((node) => ({
    edgeId: node.dataset.gradeOccurrence,
    label: node.textContent?.trim(),
    state: node.querySelector('a') ? 'linked' : 'plain',
    href: node.querySelector('a')?.getAttribute('href') ?? null,
  })),
  childActions: [...document.querySelectorAll('[data-application-action]')].map((node) => ({id: node.dataset.applicationAction, href: node.getAttribute('href')})),
  supportActions: [...document.querySelectorAll('[data-support-action]')].map((node) => ({id: node.dataset.supportAction, href: node.getAttribute('href')})),
  rfqBodyLinks: [...document.querySelectorAll('main a[href="/request-a-quote/"]')].map((node) => ({label: node.textContent?.trim(), href: node.getAttribute('href')})),
  currentNavigation: document.querySelector('nav[aria-label="Primary navigation"] [aria-current="page"]')?.textContent?.trim(),
  publicLeak: /source_page_id|"site_scope"/iu.test(document.documentElement.outerHTML),
  horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  schema: JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'),
}))

const routes = contract.routeRegistry.map((route) => route.href)
const uniqueRoutes = [...new Set(routes)]
const routeResults = []
for (const path of uniqueRoutes) {
  const initial = await fetch(new URL(path, baseUrl), {redirect: 'manual'})
  const result = await fetch(new URL(path, baseUrl))
  routeResults.push({path, initialStatus: initial.status, status: result.status, finalUrl: result.url})
}
const routeByPath = Object.fromEntries(routeResults.map((item) => [item.path, item.status]))
const gradeEdges = contract.applications.flatMap((application) => application.grades.map((grade, index) => {
  const actual = projection.gradeOccurrences.find((item) => item.edgeId === grade.edgeId)
  return {
    edgeId: grade.edgeId, applicationKey: application.key, position: index + 1,
    label: grade.gradeId, targetPageId: grade.targetPageId,
    expectedHref: grade.href, renderedState: actual?.state ?? 'missing',
    renderedHref: actual?.href ?? null, targetStatus: routeByPath[grade.href] ?? null,
    targetCanonical: `https://tio2malaysia.com${grade.href}`, locale: 'en', siteScope: 'tio2-my',
  }
}))

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

const rfqPage = await browser.newPage()
let capturedRfqPayload = null
await rfqPage.route('https://api.web3forms.com/submit', async (route) => {
  const payload = route.request().postDataJSON()
  const {access_key: _excluded, ...safePayload} = payload
  capturedRfqPayload = safePayload
  await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({success: false})})
})
await rfqPage.goto(`${baseUrl}/applications/`, {waitUntil: 'networkidle'})
await rfqPage.locator('main').getByRole('link', {name: 'Request a Quote'}).first().click()
await rfqPage.waitForURL((url) => url.pathname === '/request-a-quote' && !url.search)
await rfqPage.waitForFunction(() => (
  history.state?.tio2MyRfqSourcePageId === 'APP-000' &&
  sessionStorage.getItem('tio2MyRfqSourcePageId') === null
))
const handoffState = await rfqPage.evaluate(() => ({
  cleanUrl: `${location.origin}${location.pathname}`,
  search: location.search,
  gradeValue: document.querySelector('#rfq-grade_id')?.value,
  applicationValue: document.querySelector('#rfq-application_id')?.value,
  privateHistorySource: history.state?.tio2MyRfqSourcePageId ?? null,
  temporaryStorageCleared: sessionStorage.getItem('tio2MyRfqSourcePageId') === null,
}))
await rfqPage.locator('#rfq-grade_id').selectOption('M-350')
await rfqPage.locator('#rfq-application_id').selectOption('Coatings')
await rfqPage.locator('#rfq-quantity_mt').fill('12')
await rfqPage.locator('#rfq-destination_country').fill('Malaysia')
await rfqPage.locator('#rfq-company_name').fill('Gate 8 Test Company')
await rfqPage.locator('#rfq-contact_name').fill('Gate 8 Tester')
await rfqPage.locator('#rfq-business_email').fill('gate8@example.com')
await rfqPage.getByRole('button', {name: 'REQUEST QUOTE'}).click()
await rfqPage.getByText('Something went wrong while submitting your request.').waitFor()
const rfqHandoff = {
  checkedAt,
  baseUrl,
  transport: 'browser-intercepted-local-simulation',
  receiverRequestSentExternally: false,
  ...handoffState,
  submittedPayload: capturedRfqPayload,
  accessKeyExcluded: capturedRfqPayload !== null,
}

writeFileSync(new URL('runtime-contract.json', out), JSON.stringify({checkedAt, baseUrl, status: response.status(), pageId: 'APP-000', siteScope: 'tio2-my', buildId: process.env.APP000_BUILD_ID, implementationCommit: process.env.APP000_IMPLEMENTATION_COMMIT, projection}, null, 2) + '\n')
writeFileSync(new URL('route-matrix.json', out), JSON.stringify({checkedAt, baseUrl, routes: routeResults}, null, 2) + '\n')
writeFileSync(new URL('grade-edge-inventory.json', out), JSON.stringify({checkedAt, expectedCounts: [8,8,7,4,2,1], total: gradeEdges.length, edges: gradeEdges}, null, 2) + '\n')
writeFileSync(new URL('consumer-regression-matrix.json', out), JSON.stringify({checkedAt, baseUrl, authority: 'read-only', consumers: consumerResults}, null, 2) + '\n')
writeFileSync(new URL('shared-instance-map.json', out), JSON.stringify({checkedAt, currentNavigation: projection.currentNavigation, breadcrumb: ['Home','Applications'], supportActions: projection.supportActions, rfqBodyLinks: projection.rfqBodyLinks, childActions: projection.childActions, headerFooterOwner: 'GLOBAL-CHROME-005', publicLeak: projection.publicLeak}, null, 2) + '\n')
writeFileSync(new URL('rfq-private-handoff.json', out), JSON.stringify(rfqHandoff, null, 2) + '\n')
await browser.close()
process.stdout.write(JSON.stringify({status: 'passed', checkedAt, gradeEdges: gradeEdges.length, routes: routeResults.length, consumers: consumerResults.length}))
