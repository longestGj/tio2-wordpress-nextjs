import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'

const base = process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3231'
const output = resolve('docs/verification/tio2-my/trade4-app5-gate9-cms-alignment-20260908')
await mkdir(resolve(output, 'runtime'), {recursive: true})

const applications = [
  '/applications/titanium-dioxide-for-coatings/',
  '/applications/titanium-dioxide-for-plastics/',
  '/applications/titanium-dioxide-for-masterbatch/',
  '/applications/titanium-dioxide-for-printing-inks/',
  '/applications/titanium-dioxide-for-paper/',
]

const browser = await chromium.launch({headless: true})
const page = await browser.newPage({viewport: {width: 1440, height: 1000}})
const applicationResults = []
for (const path of applications) {
  const response = await page.goto(`${base}${path}`, {waitUntil: 'domcontentloaded'})
  const result = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    openGraphUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
    jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
    applicationHubLinks: [...document.querySelectorAll('a')].filter((link) => link.getAttribute('href') === '/applications/').length,
  }))
  applicationResults.push({path, status: response?.status() ?? null, ...result})
}

const hubResponse = await page.goto(`${base}/applications/`, {waitUntil: 'domcontentloaded'})
const hub = {path: '/applications/', status: hubResponse?.status() ?? null}

const brazil = []
for (const target of [
  {path: '/markets/brazil/', pageId: 'MARKET-BR-EN', expectedLanguage: 'en'},
  {path: '/pt-br/markets/brazil/', pageId: 'MARKET-BR-PT', expectedLanguage: 'pt-BR'},
]) {
  const response = await page.goto(`${base}${target.path}`, {waitUntil: 'networkidle'})
  const values = await page.evaluate(({pageId}) => ({
    language: document.documentElement.lang,
    identityCount: document.querySelectorAll(`[data-site-scope="tio2-my"][data-page-id="${pageId}"]`).length,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
  }), target)
  await page.screenshot({path: resolve(output, `runtime/${target.pageId}.png`), fullPage: true})
  brazil.push({...target, status: response?.status() ?? null, ...values})
}

const ukPath = '/resources/uk-titanium-dioxide-anti-dumping-investigation/'
const ukResponse = await page.goto(`${base}${ukPath}`, {waitUntil: 'domcontentloaded'})
const uk = await page.evaluate(() => {
  const heading = [...document.querySelectorAll('h3')].find((node) => node.textContent?.trim() === 'Official sources')
  const links = heading?.nextElementSibling
    ? [...heading.nextElementSibling.querySelectorAll('a')].map((link) => ({label: link.textContent?.trim() ?? '', href: link.href}))
    : []
  return {links, maintainedLinkCount: links.filter((link) => link.label === 'HMRC trade remedies guidance' && link.href.includes('check-when-you-need-to-pay-anti-dumping-countervailing-and-safeguard-duties')).length}
})
uk.path = ukPath
uk.status = ukResponse?.status() ?? null

const officialSources = uk.links.map((source) => ({
  ...source,
  status: 'NOT_RERUN',
  priorEvidence: '../trade4-app5-gate9-repair-20260908/runtime-results.json (6/6 HTTP 200)',
}))

const result = {
  checkedAt: new Date().toISOString(),
  implementationCommit: process.env.IMPLEMENTATION_COMMIT ?? null,
  buildId: (await readFile('.next-gate9-direct-4a7e170/BUILD_ID', 'utf8')).trim(),
  frontend: base,
  cmsMode: 'direct isolated WordPress :8186; no overlay',
  applications: applicationResults,
  applicationHub: hub,
  brazil,
  uk: {...uk, officialSources},
}
await writeFile(resolve(output, 'runtime-results.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
await browser.close()

const failures = [
  ...applicationResults.filter((item) => item.status !== 200 || item.canonical || item.openGraphUrl || item.jsonLdCount !== 0 || item.robots !== 'noindex, nofollow' || item.applicationHubLinks < 1),
  ...brazil.filter((item) => item.status !== 200 || item.identityCount !== 1 || item.language !== item.expectedLanguage),
]
if (uk.status !== 200 || uk.maintainedLinkCount !== 1 || uk.links.length !== 6 || failures.length) process.exitCode = 1
