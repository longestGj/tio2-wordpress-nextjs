import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'

import {JSDOM} from 'jsdom'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1)))
const planningRoot = resolve(process.env.TIO2_MY_PLANNING_ROOT ?? 'D:/23MySec')
const checkOnly = process.argv.includes('--check')

const pages = [
  {
    id: 'RES-TRADE-EU',
    slug: 'eu-titanium-dioxide-anti-dumping-duty',
    packageId: 'RES-TRADE-EU-G6-HANDOFF-01',
    packagePath: 'pages/resources/eu-trade/06_handoff/RES-TRADE-EU_GATE6_HANDOFF_PACKAGE_V0.1.md',
    packageSha256: 'bb1b44d42fa32232965e62e3255cde05518f2570224b827a1cf68c7b4fd021ad',
    buyerCopyPath: 'pages/resources/eu-trade/04_planning/RES-TRADE-EU_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md',
    buyerCopySha256: '9e119c657d6eed9346ef132e0c2039a5c99327fb9087a273df689b8a2d8a8cb1',
    visualPath: 'pages/resources/eu-trade/04_planning/gate4-v0.1/RES-TRADE-EU_GATE4_COMPLETE_VISUAL_V0.1.html',
    visualSha256: 'c525751ddb4002493a4d5303fb1f5930ed69e0ff489f224e26765a7cced29bbf',
    title: 'EU Titanium Dioxide Anti-Dumping Duty Update | TiO2 Malaysia',
    metaDescription:
      'Check the current EU anti-dumping measure for specified China-origin titanium dioxide, the 2026 reinvestigation and shipment inputs to verify.',
    heading: 'EU Titanium Dioxide Anti-Dumping Duty: Current Measure and 2026 Review',
    breadcrumbLabel: 'EU Titanium Dioxide Trade Update',
  },
  {
    id: 'RES-TRADE-UK',
    slug: 'uk-titanium-dioxide-anti-dumping-investigation',
    packageId: 'RES-TRADE-UK-G6-HANDOFF-01',
    packagePath: 'pages/resources/uk-trade/06_handoff/RES-TRADE-UK_GATE6_HANDOFF_PACKAGE_V0.1.md',
    packageSha256: 'b20932999d838eebb3c42d3e07cf22af712776a5e6f36de43a1da378e3ff2c59',
    buyerCopyPath: 'pages/resources/uk-trade/04_planning/RES-TRADE-UK_GATE2_FULL_BUYER_CLEAN_COPY_V0.3.md',
    buyerCopySha256: 'e2df4ca206fc64e984f57d6171b3037d665f279c786405a4081ebb2e63c7ac97',
    visualPath: 'pages/resources/uk-trade/04_planning/gate4-v0.1/RES-TRADE-UK_GATE4_COMPLETE_VISUAL_V0.1.html',
    visualSha256: '9ca15ee7ef19e0949b6bb383bfda20fb9ad2fce50e816ee508786f4958a457ee',
    title: 'UK Titanium Dioxide Anti-Dumping Investigation | TiO2 Malaysia',
    metaDescription:
      'Check the active UK AD0086 investigation, rutile titanium dioxide import registration, written scope, key dates and shipment inputs to verify.',
    heading: 'UK Rutile Titanium Dioxide: Active AD0086 Investigation and Import Registration',
    breadcrumbLabel: 'UK Titanium Dioxide Trade Update',
  },
  {
    id: 'RES-TRADE-IN',
    slug: 'india-titanium-dioxide-anti-dumping-duty',
    packageId: 'RES-TRADE-IN-G6-HANDOFF-01',
    packagePath: 'pages/resources/india-trade/06_handoff/RES-TRADE-IN_GATE6_HANDOFF_PACKAGE_V0.1.md',
    packageSha256: '5fa99b705b7e8a21ec2d68eb68e2f9235f295d1723bf31387a3f882b8186e0e9',
    buyerCopyPath: 'pages/resources/india-trade/04_planning/RES-TRADE-IN_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md',
    buyerCopySha256: '1234d6f2b0615aa5da488ef51dde282251e175315d9f34e140080e7e3a65252a',
    visualPath: 'pages/resources/india-trade/04_planning/gate4-v0.1/RES-TRADE-IN_GATE4_COMPLETE_VISUAL_V0.1.html',
    visualSha256: '617d8371fa0e73dc14e571ce9b3c75c8d84390c638e19039487db4f432e5d833',
    title: 'India Titanium Dioxide Anti-Dumping Duty Status | TiO2 Malaysia',
    metaDescription:
      'Check the quashed 2025 India TiO2 levy, DGTR’s 2026 recommendation, product scope, producer paths and shipment inputs to verify.',
    heading: 'India Titanium Dioxide Anti-Dumping Duty: 2025 Levy Quashed, 2026 Recommendation Explained',
    breadcrumbLabel: 'India Titanium Dioxide Trade Update',
  },
  {
    id: 'RES-TRADE-BR',
    slug: 'brazil-titanium-dioxide-anti-dumping-duty',
    packageId: 'RES-TRADE-BR-G6-HANDOFF-02',
    packagePath: 'pages/resources/brazil-trade/06_handoff/RES-TRADE-BR_GATE6_HANDOFF_PACKAGE_V0.2.md',
    packageSha256: '9d0b24b5f49a7f275f6385e2db34ade3f12ffab58aa52012b59ce284b1dac592',
    buyerCopyPath: 'pages/resources/brazil-trade/04_planning/RES-TRADE-BR_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md',
    buyerCopySha256: 'bb83adeb1a2a21ee7b7c4d854d569d5b73ba6a9fc75421a387fe9eeded5b6c5f',
    visualPath: 'pages/resources/brazil-trade/04_planning/gate4-v0.1/RES-TRADE-BR_GATE4_FULL_VISUAL_V0.1.html',
    visualSha256: 'bc7c17dee83596aa480bda6c6764d37931ccf830e0c7a2fe0c24e4c272f2ddeb',
    title: 'Brazil Titanium Dioxide Anti-Dumping Duty | TiO2 Malaysia',
    metaDescription:
      'Check Brazil’s definitive TiO2 anti-dumping measure, China-origin scope, four USD/t bands, exclusions and shipment inputs to verify.',
    heading: 'Brazil Titanium Dioxide Anti-Dumping Duty: Current Measure, Scope and Rates',
    breadcrumbLabel: 'Brazil Titanium Dioxide Trade Update',
  },
]

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function assertHash(name, bytes, expected) {
  const actual = sha256(bytes)
  if (actual !== expected) throw new Error(`${name} SHA-256 mismatch: expected ${expected}, received ${actual}`)
}

function matchingBrace(source, open) {
  let depth = 1
  for (let cursor = open + 1; cursor < source.length; cursor += 1) {
    if (source[cursor] === '{') depth += 1
    if (source[cursor] === '}') depth -= 1
    if (depth === 0) return cursor
  }
  throw new Error('Unbalanced CSS block in approved visual source')
}

function prefixSelector(selector, pageId) {
  const scope = `[data-editorial-page="${pageId}"]`
  const bodyAsMain = selector.replace(/\bbody\b/g, 'main').trim()
  if (bodyAsMain === '*') return [`${scope} main`, `${scope} main *`]
  const mainSelector = bodyAsMain.startsWith('main') ? bodyAsMain : `main ${bodyAsMain}`
  return [`${scope} ${mainSelector}`]
}

function scopeCss(source, pageId) {
  const css = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\bInter\s*,\s*Arial\s*,\s*sans-serif\b/gi, 'var(--font-my-shared),Arial,sans-serif')
    .trim()
  let cursor = 0
  let result = ''

  while (cursor < css.length) {
    const open = css.indexOf('{', cursor)
    if (open === -1) break
    const prelude = css.slice(cursor, open).trim()
    const close = matchingBrace(css, open)
    const body = css.slice(open + 1, close)

    if (/^@media\b/.test(prelude)) {
      result += `${prelude}{${scopeCss(body, pageId)}}\n`
    } else if (prelude.startsWith('@')) {
      throw new Error(`Unsupported page CSS rule: ${prelude}`)
    } else {
      const selectors = prelude
        .split(',')
        .flatMap((selector) => prefixSelector(selector, pageId))
        .join(',')
      result += `${selectors}{${body.trim()}}\n`
    }
    cursor = close + 1
  }

  return result
}

function extractPageCss(document, pageId) {
  const style = document.querySelector('style')?.textContent
  if (!style) throw new Error(`${pageId} visual source has no style block`)
  const pageStart = style.lastIndexOf('*{box-sizing:border-box}')
  if (pageStart < 0) throw new Error(`${pageId} visual source has no page CSS marker`)
  return scopeCss(style.slice(pageStart), pageId)
}

async function emit(path, content) {
  if (checkOnly) {
    const current = await readFile(path, 'utf8')
    if (current !== content) throw new Error(`Generated output is stale: ${path}`)
    return
  }
  await mkdir(resolve(path, '..'), {recursive: true})
  await writeFile(path, content, 'utf8')
}

for (const page of pages) {
  const [packageBytes, buyerCopyBytes, visualBytes] = await Promise.all([
    readFile(resolve(planningRoot, page.packagePath)),
    readFile(resolve(planningRoot, page.buyerCopyPath)),
    readFile(resolve(planningRoot, page.visualPath)),
  ])
  assertHash(`${page.id} package`, packageBytes, page.packageSha256)
  assertHash(`${page.id} buyer copy`, buyerCopyBytes, page.buyerCopySha256)
  assertHash(`${page.id} visual`, visualBytes, page.visualSha256)

  const document = new JSDOM(visualBytes.toString('utf8')).window.document
  const main = document.querySelector('main')
  const h1 = main?.querySelector('h1')?.textContent?.trim()
  if (!main || h1 !== page.heading) throw new Error(`${page.id} visual main/H1 does not match the approved contract`)

  const bodyHtml = main.innerHTML
  const route = `/resources/${page.slug}/`
  const payload = {
    identity: {
      pageId: page.id,
      siteScope: 'tio2-my',
      locale: 'en',
      path: route,
      section: 'resources',
      provisional: false,
      schemaVersion: 'editorial-v0.1',
    },
    source: {
      packageId: page.packageId,
      packageSha256: page.packageSha256,
      bodySha256: page.buyerCopySha256,
      renderedBodySha256: sha256(bodyHtml),
      visualSha256: page.visualSha256,
    },
    seo: {
      title: page.title,
      metaDescription: page.metaDescription,
      canonical: `https://tio2malaysia.com${route}`,
    },
    heading: page.heading,
    breadcrumb: [
      {label: 'Home', href: '/'},
      {label: 'Resources', href: '/resources/'},
      {label: page.breadcrumbLabel, href: route},
    ],
    bodyHtml,
    mainClass: main.getAttribute('class') ?? '',
    freshness: {
      lastReviewed: '2026-09-07',
      nextReviewDue: '2026-10-07',
      status: 'unverified',
      evidenceDate: null,
    },
  }

  await Promise.all([
    emit(
      resolve(
        repoRoot,
        `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${page.id.toLowerCase()}.json`,
      ),
      `${JSON.stringify(payload, null, 2)}\n`,
    ),
    emit(resolve(repoRoot, `components/sites/tio2-my/editorial/${page.id.toLowerCase()}.css`), extractPageCss(document, page.id)),
  ])
}

process.stdout.write(`${checkOnly ? 'Checked' : 'Built'} ${pages.length} Trade Resource payloads.\n`)
