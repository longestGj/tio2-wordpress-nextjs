import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'

type PageExpectation = {
  id: string
  slug: string
  packagePath: string
  packageSha256: string
  buyerCopyPath: string
  buyerCopySha256: string
  contractPath: string
  visualPath: string
  visualSha256: string
  title: string
  metaDescription: string
  heading: string
  breadcrumbLabel: string
  moduleCount: number
  tableBodyRows: number[]
  freshnessPolicyPattern: RegExp
}

type EditorialPayload = {
  identity: {
    pageId: string
    siteScope: string
    locale: string
    path: string
    section: string
    provisional: boolean
    schemaVersion: string
  }
  source: {
    packageId: string
    packageSha256: string
    bodySha256: string
    renderedBodySha256: string
    visualSha256: string
  }
  seo: {title: string; metaDescription: string; canonical: string}
  heading: string
  breadcrumb: Array<{label: string; href: string}>
  bodyHtml: string
  mainClass: string
  freshness: {
    lastReviewed: string
    nextReviewDue: string
    status: string
    evidenceDate: string | null
  }
}

const repoRoot = resolve('.')
const planningRoot = resolve('D:/23MySec')

const pages: PageExpectation[] = [
  {
    id: 'RES-TRADE-EU',
    slug: 'eu-titanium-dioxide-anti-dumping-duty',
    packagePath: 'pages/resources/eu-trade/06_handoff/RES-TRADE-EU_GATE6_HANDOFF_PACKAGE_V0.1.md',
    packageSha256: 'bb1b44d42fa32232965e62e3255cde05518f2570224b827a1cf68c7b4fd021ad',
    buyerCopyPath: 'pages/resources/eu-trade/04_planning/RES-TRADE-EU_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md',
    buyerCopySha256: '9e119c657d6eed9346ef132e0c2039a5c99327fb9087a273df689b8a2d8a8cb1',
    contractPath: 'pages/resources/eu-trade/04_planning/RES-TRADE-EU_GATE2_CONTENT_CONTRACT_V0.2.md',
    visualPath: 'pages/resources/eu-trade/04_planning/gate4-v0.1/RES-TRADE-EU_GATE4_COMPLETE_VISUAL_V0.1.html',
    visualSha256: 'c525751ddb4002493a4d5303fb1f5930ed69e0ff489f224e26765a7cced29bbf',
    title: 'EU Titanium Dioxide Anti-Dumping Duty Update | TiO2 Malaysia',
    metaDescription:
      'Check the current EU anti-dumping measure for specified China-origin titanium dioxide, the 2026 reinvestigation and shipment inputs to verify.',
    heading: 'EU Titanium Dioxide Anti-Dumping Duty: Current Measure and 2026 Review',
    breadcrumbLabel: 'EU Titanium Dioxide Trade Update',
    moduleCount: 6,
    tableBodyRows: [4],
    freshnessPolicyPattern: /next due no later than 7 October 2026/,
  },
  {
    id: 'RES-TRADE-UK',
    slug: 'uk-titanium-dioxide-anti-dumping-investigation',
    packagePath: 'pages/resources/uk-trade/06_handoff/RES-TRADE-UK_GATE6_HANDOFF_PACKAGE_V0.1.md',
    packageSha256: 'b20932999d838eebb3c42d3e07cf22af712776a5e6f36de43a1da378e3ff2c59',
    buyerCopyPath: 'pages/resources/uk-trade/04_planning/RES-TRADE-UK_GATE2_FULL_BUYER_CLEAN_COPY_V0.3.md',
    buyerCopySha256: 'e2df4ca206fc64e984f57d6171b3037d665f279c786405a4081ebb2e63c7ac97',
    contractPath: 'pages/resources/uk-trade/04_planning/RES-TRADE-UK_GATE2_CONTENT_CONTRACT_V0.3.md',
    visualPath: 'pages/resources/uk-trade/04_planning/gate4-v0.1/RES-TRADE-UK_GATE4_COMPLETE_VISUAL_V0.1.html',
    visualSha256: '9ca15ee7ef19e0949b6bb383bfda20fb9ad2fce50e816ee508786f4958a457ee',
    title: 'UK Titanium Dioxide Anti-Dumping Investigation | TiO2 Malaysia',
    metaDescription:
      'Check the active UK AD0086 investigation, rutile titanium dioxide import registration, written scope, key dates and shipment inputs to verify.',
    heading: 'UK Rutile Titanium Dioxide: Active AD0086 Investigation and Import Registration',
    breadcrumbLabel: 'UK Titanium Dioxide Trade Update',
    moduleCount: 7,
    tableBodyRows: [4, 3, 4],
    freshnessPolicyPattern: /active-case 30-day maximum/,
  },
  {
    id: 'RES-TRADE-IN',
    slug: 'india-titanium-dioxide-anti-dumping-duty',
    packagePath: 'pages/resources/india-trade/06_handoff/RES-TRADE-IN_GATE6_HANDOFF_PACKAGE_V0.1.md',
    packageSha256: '5fa99b705b7e8a21ec2d68eb68e2f9235f295d1723bf31387a3f882b8186e0e9',
    buyerCopyPath: 'pages/resources/india-trade/04_planning/RES-TRADE-IN_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md',
    buyerCopySha256: '1234d6f2b0615aa5da488ef51dde282251e175315d9f34e140080e7e3a65252a',
    contractPath: 'pages/resources/india-trade/04_planning/RES-TRADE-IN_GATE2_CONTENT_CONTRACT_V0.1.md',
    visualPath: 'pages/resources/india-trade/04_planning/gate4-v0.1/RES-TRADE-IN_GATE4_COMPLETE_VISUAL_V0.1.html',
    visualSha256: '617d8371fa0e73dc14e571ce9b3c75c8d84390c638e19039487db4f432e5d833',
    title: 'India Titanium Dioxide Anti-Dumping Duty Status | TiO2 Malaysia',
    metaDescription:
      'Check the quashed 2025 India TiO2 levy, DGTR’s 2026 recommendation, product scope, producer paths and shipment inputs to verify.',
    heading: 'India Titanium Dioxide Anti-Dumping Duty: 2025 Levy Quashed, 2026 Recommendation Explained',
    breadcrumbLabel: 'India Titanium Dioxide Trade Update',
    moduleCount: 8,
    tableBodyRows: [6, 6, 3],
    freshnessPolicyPattern: /30-day active\/unresolved window/,
  },
  {
    id: 'RES-TRADE-BR',
    slug: 'brazil-titanium-dioxide-anti-dumping-duty',
    packagePath: 'pages/resources/brazil-trade/06_handoff/RES-TRADE-BR_GATE6_HANDOFF_PACKAGE_V0.2.md',
    packageSha256: '9d0b24b5f49a7f275f6385e2db34ade3f12ffab58aa52012b59ce284b1dac592',
    buyerCopyPath: 'pages/resources/brazil-trade/04_planning/RES-TRADE-BR_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md',
    buyerCopySha256: 'bb83adeb1a2a21ee7b7c4d854d569d5b73ba6a9fc75421a387fe9eeded5b6c5f',
    contractPath: 'pages/resources/brazil-trade/04_planning/RES-TRADE-BR_GATE2_CONTENT_CONTRACT_V0.2.md',
    visualPath: 'pages/resources/brazil-trade/04_planning/gate4-v0.1/RES-TRADE-BR_GATE4_FULL_VISUAL_V0.1.html',
    visualSha256: 'bc7c17dee83596aa480bda6c6764d37931ccf830e0c7a2fe0c24e4c272f2ddeb',
    title: 'Brazil Titanium Dioxide Anti-Dumping Duty | TiO2 Malaysia',
    metaDescription:
      'Check Brazil’s definitive TiO2 anti-dumping measure, China-origin scope, four USD/t bands, exclusions and shipment inputs to verify.',
    heading: 'Brazil Titanium Dioxide Anti-Dumping Duty: Current Measure, Scope and Rates',
    breadcrumbLabel: 'Brazil Titanium Dioxide Trade Update',
    moduleCount: 8,
    tableBodyRows: [6, 4, 3],
    freshnessPolicyPattern: /30-day active\/unresolved window/,
  },
]

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim()
}

function normalizeMarkdownInline(value: string) {
  return normalizeText(
    value
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^(?:Primary|Secondary) action:\s*/i, '')
      .replace(/\\\|/g, '|'),
  )
}

function markdownPublicBlocks(markdown: string, pageId: string) {
  const marker = pageId === 'RES-TRADE-EU' ? '### Breadcrumb' : '\n---\n'
  const markerIndex = markdown.indexOf(marker)
  expect(markerIndex, `${pageId} public-copy marker`).toBeGreaterThanOrEqual(0)
  const publicCopy = markdown.slice(markerIndex + marker.length)
  const blocks: string[] = []

  for (const rawLine of publicCopy.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || /^\|(?:\s*:?-+:?\s*\|)+$/.test(line)) continue

    if (line.startsWith('|') && line.endsWith('|')) {
      blocks.push(
        ...line
          .slice(1, -1)
          .split('|')
          .map(normalizeMarkdownInline),
      )
      continue
    }

    const withoutHeading = line.replace(/^#{1,6}\s+/, '')
    const withoutListMarker = withoutHeading.replace(/^(?:[-*+] |\d+\.\s+)/, '')
    blocks.push(normalizeMarkdownInline(withoutListMarker))
  }

  return blocks
}

function htmlVisibleBlocks(html: string) {
  const document = new JSDOM(`<main>${html}</main>`).window.document
  return Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,th,td,li')).map((element) =>
    normalizeText(element.textContent ?? ''),
  )
}

function markdownLinks(markdown: string, pageId: string) {
  const marker = pageId === 'RES-TRADE-EU' ? '### Breadcrumb' : '\n---\n'
  const publicCopy = markdown.slice(markdown.indexOf(marker) + marker.length)
  return Array.from(publicCopy.matchAll(/\[([^\]]+)\]\(((?:[^()]|\([^)]*\))*)\)/g), ([, label, href]) => ({
    label: normalizeMarkdownInline(label),
    href,
  }))
}

function collectSelectors(css: string) {
  const selectors: string[] = []
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')

  function visit(block: string) {
    let cursor = 0
    while (cursor < block.length) {
      const open = block.indexOf('{', cursor)
      if (open === -1) break
      const prelude = block.slice(cursor, open).trim()
      let depth = 1
      let close = open + 1
      while (close < block.length && depth > 0) {
        if (block[close] === '{') depth += 1
        if (block[close] === '}') depth -= 1
        close += 1
      }
      const body = block.slice(open + 1, close - 1)
      if (/^@(media|supports|layer|container)\b/.test(prelude)) visit(body)
      else if (!prelude.startsWith('@')) selectors.push(...prelude.split(',').map((item) => item.trim()))
      cursor = close
    }
  }

  visit(source)
  return selectors
}

async function readPayload(page: PageExpectation) {
  const path = resolve(
    repoRoot,
    `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${page.id.toLowerCase()}.json`,
  )
  return JSON.parse(await readFile(path, 'utf8')) as EditorialPayload
}

describe('approved Trade Resource editorial payloads', () => {
  for (const page of pages) {
    test(`${page.id} preserves the approved main copy, links, modules, tables and provenance`, async () => {
      const [payload, packageBytes, buyerCopyBytes, contract, visualBytes] = await Promise.all([
        readPayload(page),
        readFile(resolve(planningRoot, page.packagePath)),
        readFile(resolve(planningRoot, page.buyerCopyPath)),
        readFile(resolve(planningRoot, page.contractPath), 'utf8'),
        readFile(resolve(planningRoot, page.visualPath)),
      ])
      const visual = new JSDOM(visualBytes.toString('utf8')).window.document
      const visualMain = visual.querySelector('main')
      const buyerCopy = buyerCopyBytes.toString('utf8')
      expect(visualMain).not.toBeNull()

      expect(sha256(packageBytes)).toBe(page.packageSha256)
      expect(sha256(buyerCopyBytes)).toBe(page.buyerCopySha256)
      expect(sha256(visualBytes)).toBe(page.visualSha256)
      expect(payload.identity).toEqual({
        pageId: page.id,
        siteScope: 'tio2-my',
        locale: 'en',
        path: `/resources/${page.slug}/`,
        section: 'resources',
        provisional: false,
        schemaVersion: 'editorial-v0.1',
      })
      expect(payload.source).toEqual({
        packageId: page.id === 'RES-TRADE-BR' ? 'RES-TRADE-BR-G6-HANDOFF-02' : `${page.id}-G6-HANDOFF-01`,
        packageSha256: page.packageSha256,
        bodySha256: page.buyerCopySha256,
        renderedBodySha256: sha256(payload.bodyHtml),
        visualSha256: page.visualSha256,
      })
      expect(payload.seo).toEqual({
        title: page.title,
        metaDescription: page.metaDescription,
        canonical: `https://tio2malaysia.com/resources/${page.slug}/`,
      })
      expect(payload.heading).toBe(page.heading)
      expect(payload.breadcrumb).toEqual([
        {label: 'Home', href: '/'},
        {label: 'Resources', href: '/resources/'},
        {label: page.breadcrumbLabel, href: `/resources/${page.slug}/`},
      ])
      expect(payload.mainClass).toBe(visualMain?.getAttribute('class') ?? '')
      expect(payload.freshness).toEqual({
        lastReviewed: '2026-09-07',
        nextReviewDue: '2026-10-07',
        status: 'unverified',
        evidenceDate: null,
      })
      expect(contract).toMatch(/(?:Visible|Public) `Last reviewed`(?: date)?: \*{0,2}7 September 2026/)
      expect(`${contract}\n${packageBytes.toString('utf8')}`).toMatch(page.freshnessPolicyPattern)

      expect(payload.bodyHtml).toBe(visualMain?.innerHTML)
      expect(htmlVisibleBlocks(payload.bodyHtml)).toEqual(markdownPublicBlocks(buyerCopy, page.id))

      const body = new JSDOM(`<main>${payload.bodyHtml}</main>`).window.document
      expect(body.querySelector('h1')?.textContent).toBe(page.heading)
      expect(body.querySelectorAll('h1')).toHaveLength(1)
      expect(body.querySelectorAll('section.module')).toHaveLength(page.moduleCount)
      expect(Array.from(body.querySelectorAll('table'), (table) => table.tBodies[0]?.rows.length ?? 0)).toEqual(
        page.tableBodyRows,
      )

      const approvedLinks = markdownLinks(buyerCopy, page.id)
      const renderedLinks = Array.from(body.querySelectorAll('a'), (link) => ({
        label: normalizeText(link.textContent ?? ''),
        href: link.getAttribute('href'),
      }))
      expect(renderedLinks).toEqual(approvedLinks)

      for (const table of body.querySelectorAll('table')) {
        const headerIds = new Set(Array.from(table.querySelectorAll('th[id]'), (header) => header.id))
        expect(Array.from(table.querySelectorAll('th')).every((header) => header.getAttribute('scope') === 'col')).toBe(true)
        for (const cell of table.querySelectorAll('td[headers]')) {
          expect(headerIds.has(cell.getAttribute('headers') ?? '')).toBe(true)
          expect(cell.getAttribute('data-label')).toBeTruthy()
        }
      }

      expect(payload.bodyHtml).not.toMatch(/<(?:header|footer|script|style|dialog|form)\b/i)
      expect(payload.bodyHtml).not.toMatch(/\sstyle\s*=|file:\/\/|localNavigationIntents|cookie-layer/i)
    })

    test(`${page.id} stylesheet is isolated to its editorial main`, async () => {
      const css = await readFile(
        resolve(repoRoot, `components/sites/tio2-my/editorial/${page.id.toLowerCase()}.css`),
        'utf8',
      )
      const scope = `[data-editorial-page="${page.id}"] main`
      const selectors = collectSelectors(css)

      expect(selectors.length).toBeGreaterThan(0)
      expect(selectors.every((selector) => selector.startsWith(scope))).toBe(true)
      expect(css).not.toMatch(/(?:^|[\s,{])(?:body|html|\.header|\.footer|\.cookie-layer)(?:[\s,{:.#]|$)/m)
      expect(css).not.toMatch(/@font-face|file:\/\/|dependencies\//i)
      expect(css).toContain('var(--font-my-shared),Arial,sans-serif')
      expect(css).not.toMatch(/(?:font|font-family):[^;}]*\bInter\b/i)
    })
  }
})
