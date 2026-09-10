import {createHash} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {chromium} from '@playwright/test'

const baseUrl = process.env.CONTACT_BASE_URL ?? 'http://127.0.0.1:4491'
const cmsUrl = process.env.CONTACT_CMS_EVIDENCE_URL ?? 'http://127.0.0.1:8080/graphql'
const implementationCommit = process.env.CONTACT_IMPLEMENTATION_COMMIT ?? 'unrecorded'
const out = new URL('../runtime/', import.meta.url)
mkdirSync(out, {recursive: true})
const checkedAt = new Date().toISOString()
const sha256 = (value) => createHash('sha256').update(value).digest('hex').toUpperCase()

const cmsResponse = await fetch(cmsUrl, {
  method: 'POST', headers: {'content-type': 'application/json'},
  body: JSON.stringify({query: 'query ContactGate8Evidence { malaysiaContactPageRecordJson }'}),
})
const cmsPayload = await cmsResponse.json()
if (!cmsResponse.ok || cmsPayload.errors?.length) throw new Error(`Contact CMS evidence failed: ${JSON.stringify(cmsPayload.errors ?? cmsResponse.status)}`)
const cmsRecord = JSON.parse(cmsPayload.data.malaysiaContactPageRecordJson)
const cmsContract = JSON.parse(cmsRecord.malaysiaContactPageContractJson)
writeFileSync(new URL('cms-source-chain.json', out), JSON.stringify({
  checkedAt, environment: 'local WordPress integration', endpointHost: new URL(cmsUrl).host,
  responseStatus: cmsResponse.status, id: cmsRecord.id, modifiedGmt: cmsRecord.modifiedGmt,
  status: cmsRecord.status, siteScopes: cmsRecord.siteScopes, publicPath: cmsRecord.publishingFields?.publicPath,
  pageId: cmsContract.identity?.pageId, contractVersion: cmsContract.identity?.contractVersion,
  contractSha256: sha256(cmsRecord.malaysiaContactPageContractJson), fieldCount: cmsContract.form?.fields?.length,
}, null, 2) + '\n')

const browser = await chromium.launch({headless: true})
const page = await browser.newPage({viewport: {width: 1440, height: 1000}})
const pageResponse = await page.goto(`${baseUrl}/contact/`, {waitUntil: 'networkidle'})
if (pageResponse?.status() !== 200) throw new Error(`Contact route returned ${pageResponse?.status()}`)
const projection = await page.evaluate(() => ({
  title: document.title,
  lang: document.documentElement.lang,
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
  pageId: document.querySelector('[data-page-id]')?.getAttribute('data-page-id'),
  siteScope: document.querySelector('[data-site-scope]')?.getAttribute('data-site-scope'),
  modules: [...document.querySelectorAll('main [data-module]')].map((node) => node.getAttribute('data-module')),
  fields: [...document.querySelectorAll('[data-contact-field]')].map((node) => node.getAttribute('data-contact-field')),
  currentNavigation: [...document.querySelectorAll('header a[aria-current="page"]')].map((node) => node.textContent?.trim()),
  schemaTypes: (JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}')['@graph'] ?? []).map((node) => node['@type']),
  horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  plainGeneralEmail: [...document.querySelectorAll('dd')].some((node) => node.textContent?.trim() === 'info@tio2malaysia.com'),
  emailActionCount: document.querySelectorAll('a[href^="mailto:"],a[href^="tel:"]').length,
}))
await browser.close()

const buildId = readFileSync(new URL('../../../../../.next-contact-gate8/BUILD_ID', import.meta.url), 'utf8').trim()
writeFileSync(new URL('runtime-contract.json', out), JSON.stringify({
  checkedAt, environment: 'local production build with scoped CMS fixture for Contact and local prerelease CMS for existing routes',
  baseUrl, status: pageResponse.status(), buildId, implementationCommit, projection,
}, null, 2) + '\n')

const routes = []
for (const path of ['/contact/', '/request-a-quote/', '/request-documents/', '/request-sample/', '/privacy-policy/']) {
  const response = await fetch(new URL(path, baseUrl))
  routes.push({path, status: response.status, finalPath: new URL(response.url).pathname})
}
const sitemapResponse = await fetch(new URL('/sitemap.xml', baseUrl))
const sitemapBody = await sitemapResponse.text()
writeFileSync(new URL('route-and-sitemap-matrix.json', out), JSON.stringify({
  checkedAt, routes, sitemapStatus: sitemapResponse.status,
  contactInSitemap: sitemapBody.includes('https://tio2malaysia.com/contact/'),
  releaseReason: 'CONTACT-DEP03/04/06/09/10 remain open',
}, null, 2) + '\n')

const valid = {
  full_name: 'Gate Eight Local Test', company: 'Local Test Company', business_email: 'gate8@example.com',
  country_region: 'Malaysia', subject: 'General inquiry test', message: 'Local fail-closed API classification test.',
}
const post = (body) => fetch(new URL('/api/contact/submit', baseUrl), {
  method: 'POST', headers: {'content-type': 'application/json', 'x-tio2-site-scope': 'tio2-my'}, body: JSON.stringify(body),
})
const invalidResponse = await post({...valid, message: ''})
const validResponse = await post(valid)
writeFileSync(new URL('fail-closed-api.json', out), JSON.stringify({
  checkedAt, externalRequestMade: false, processorConfigured: false, receiverConfigured: false,
  invalid: {status: invalidResponse.status, result: await invalidResponse.json()},
  valid: {status: validResponse.status, result: await validResponse.json()},
  successPredicateAvailable: false, receiverReceiptConfirmed: false,
}, null, 2) + '\n')

process.stdout.write(JSON.stringify({status: 'passed', checkedAt, buildId, routes: routes.length, cmsStatus: cmsResponse.status}))
