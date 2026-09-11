import {requiredLocalUrl} from './support/required-local-url'
import AxeBuilder from '@axe-core/playwright'
import {createHash} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {JSDOM} from 'jsdom'
import {expect, test, type Page} from '@playwright/test'

import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

interface CountryContract {
  readonly identity: {readonly pageId: string; readonly path: string}
  readonly destinationCountry: string
  readonly seo: {readonly title: string; readonly metaDescription: string; readonly canonical: string}
  readonly modules: ReadonlyArray<{readonly id: string; readonly heading: string}>
}

const baseUrl = requiredLocalUrl('TIO2_MY_BASE_URL').origin
const wordpressUrl = requiredLocalUrl('WORDPRESS_GRAPHQL_URL', '/graphql').href
const evidenceRoot = process.env.COUNTRY_EVIDENCE_DIR ?? 'docs/verification/tio2-my/market-four-gate9-es-f01-repair-20260908/screenshots'
const pages = [
  ['spain', 'tio2-my-market-eu-es.json'],
  ['india', 'tio2-my-market-in-001.json'],
  ['netherlands', 'tio2-my-market-eu-nl.json'],
  ['belgium', 'tio2-my-market-eu-be.json'],
] as const
const approvedLogicalHeights: Readonly<Record<string, Readonly<Record<number, number>>>> = {
  'MARKET-EU-ES': {1440: 2673, 768: 2951, 390: 3954},
  'MARKET-IN-001': {1440: 4617, 768: 5253, 390: 6793},
  'MARKET-EU-NL': {1440: 3590, 768: 4048, 390: 5320},
  'MARKET-EU-BE': {1440: 3654, 768: 4170, 390: 5369},
}
const runtimeEvidence: Record<string, unknown> = {}

mkdirSync(evidenceRoot, {recursive: true})
test.afterAll(() => writeFileSync(
  process.env.COUNTRY_RUNTIME_EVIDENCE ?? 'docs/verification/tio2-my/market-four-gate9-es-f01-repair-20260908/runtime-matrix.json',
  `${JSON.stringify(runtimeEvidence, null, 2)}\n`,
))

function loadContract(file: string) {
  return JSON.parse(readFileSync(
    `wordpress/plugins/tio2-site-model/config/${file}`,
    'utf8',
  )) as CountryContract
}

test('WordPress resolver returns four exact tio2-my records without fallback', async ({request}) => {
  expect(wordpressUrl, 'WORDPRESS_GRAPHQL_URL is required for CMS read-back evidence').toBeTruthy()
  const readback: Record<string, unknown> = {}
  for (const [, file] of pages) {
    const contract = loadContract(file)
    const variables = {pageId: contract.identity.pageId}
    const response = await request.post(wordpressUrl!, {data: {
      query: 'query Gate9CountryMarketReadback($pageId: String!) { malaysiaCountryMarketRecordJson(pageId: $pageId) }',
      variables,
    }})
    expect(response.status()).toBe(200)
    const body = await response.json() as {
      readonly data?: {readonly malaysiaCountryMarketRecordJson?: string}
      readonly errors?: readonly unknown[]
    }
    expect(body.errors).toBeUndefined()
    const raw = JSON.parse(body.data?.malaysiaCountryMarketRecordJson ?? 'null') as {
      readonly publishingFields?: {readonly publicPath?: string}
      readonly recordPageId?: string
      readonly siteScopes?: {readonly nodes?: readonly {readonly slug?: string}[]}
      readonly status?: string
    }
    expect(raw.recordPageId).toBe(contract.identity.pageId)
    expect(raw.status).toBe('publish')
    expect(raw.publishingFields?.publicPath).toBe(contract.identity.path.replace(/\/$/u, ''))
    expect(raw.siteScopes?.nodes?.map(({slug}) => slug)).toEqual(['tio2-my'])
    readback[contract.identity.pageId] = {body, variables}
  }
  writeFileSync(
    process.env.COUNTRY_CMS_EVIDENCE ?? 'docs/verification/tio2-my/market-four-gate9-repair-20260908/cms-resolver-readback.json',
    `${JSON.stringify(readback, null, 2)}\n`,
  )
})

async function ready(page: Page, pathname: string) {
  const response = await page.goto(`${baseUrl}${pathname}`, {waitUntil: 'networkidle'})
  expect(response?.status()).toBe(200)
  await page.evaluate(() => document.fonts.ready)
  return response
}

for (const [slug, file] of pages) {
  const contract = loadContract(file)
  const pathname = `/markets/${slug}/`

  test(`${contract.identity.pageId} initial HTML, metadata, links and graph stay inside the approved contract`, async ({request}) => {
    const response = await request.get(`${baseUrl}${pathname}?utm_source=gate8`, {maxRedirects: 0})
    expect(response.status()).toBe(200)
    const document = new JSDOM(await response.text()).window.document

    expect(document.title).toBe(contract.seo.title)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(contract.seo.metaDescription)
    expect([...document.querySelectorAll('link[rel="canonical"]')].map((node) => node.getAttribute('href'))).toEqual([contract.seo.canonical])
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    expect(document.querySelector('link[hreflang]')).toBeNull()
    expect([...document.querySelectorAll('main [data-module]')].map((node) => node.getAttribute('data-module'))).toEqual([
      'breadcrumb',
      ...contract.modules.map(({id}) => id),
    ])
    expect([...document.querySelectorAll('main section[data-module] > div > :is(h1,h2)')].map((node) => node.textContent)).toEqual(
      contract.modules.map(({heading}) => heading),
    )
    expect(document.querySelectorAll('main h1')).toHaveLength(1)
    expect(document.querySelector('main form')).toBeNull()
    expect(document.querySelector('main')?.textContent).not.toMatch(/PT-BR|release blocker|site_scope|TIOVAR/iu)
    for (const link of document.querySelectorAll('main a')) {
      expect(link.getAttribute('href')).toBeTruthy()
      expect(link.getAttribute('href')).not.toMatch(/^javascript:/iu)
    }
    for (const link of document.querySelectorAll('main a[href^="/request-a-quote/"]')) {
      const url = new URL(link.getAttribute('href')!, 'https://tio2malaysia.com')
      expect(url.searchParams.get('destination_country')).toBe(contract.destinationCountry)
      expect(url.searchParams.get('source_page_id')).toBe(contract.identity.pageId)
    }
    for (const link of document.querySelectorAll('main a[href^="/request-documents/"]')) {
      const url = new URL(link.getAttribute('href')!, 'https://tio2malaysia.com')
      expect(url.searchParams.get('source_page_id')).toBe(contract.identity.pageId)
      expect(url.searchParams.get('market_id')).toBe(contract.identity.pageId)
      expect(url.searchParams.get('destination_country')).toBeNull()
    }

    const graph = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(graph[0]).toMatchObject({
      '@id': `${contract.seo.canonical}#webpage`,
      url: contract.seo.canonical,
      isPartOf: {'@id': 'https://tio2malaysia.com/#website'},
      publisher: {'@id': 'https://tio2malaysia.com/#organization'},
      breadcrumb: {'@id': `${contract.seo.canonical}#breadcrumb`},
    })
    const schemaKeys = new Set<string>()
    JSON.stringify(graph, (key, value) => {
      if (key) schemaKeys.add(key)
      return value
    })
    for (const field of ['manufacturer', 'datePublished', 'dateModified']) expect(schemaKeys.has(field)).toBe(false)

    const sitemap = await request.get(`${baseUrl}/sitemap.xml`)
    expect(await sitemap.text()).not.toContain(contract.seo.canonical)
    runtimeEvidence[`${contract.identity.pageId}-ssr`] = {
      canonical: contract.seo.canonical,
      jsonLdNodes: graph.length,
      moduleOrder: contract.modules.map(({id}) => id),
      robots: 'noindex, nofollow',
      sitemapOmitted: true,
    }
  })

  for (const width of [1440, 768, 390] as const) {
    test(`${contract.identity.pageId} ${width}px shared Chrome, responsive layout, a11y and screenshot`, async ({page}) => {
      await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
      await page.emulateMedia({reducedMotion: 'reduce'})
      const remoteRequests: string[] = []
      page.on('request', (request) => {
        const url = new URL(request.url())
        if (! ['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.href)
      })
      await ready(page, pathname)
      await expect(page.locator('[data-site-scope="tio2-my"][data-page-id]').first())
        .toHaveAttribute('data-page-id', contract.identity.pageId)

      const compact = width <= 900
      const header = page.locator('header')
      expect(await header.locator(':scope > div').first().evaluate((node) => node.getBoundingClientRect().height)).toBe(compact ? 64 : 84)
      await assertRenderedMalaysiaHeaderLogo(header.locator('img[alt="TiO2 Malaysia"]').first(), {
        width: compact ? 120 : 180,
        height: compact ? 40 : 60,
      })
      await expect(header).not.toContainText('CURRENT')
      const desktopNav = header.getByRole('navigation', {name: 'Primary navigation', exact: true})
      if (compact) {
        await expect(desktopNav).toHaveCount(0)
      } else {
        await expect(desktopNav.locator('[aria-current="page"]')).toHaveText('Markets')
        expect(await desktopNav.locator('[aria-current="page"]').evaluate((node) => getComputedStyle(node, '::after').height)).toBe('3px')
      }
      for (const link of await page.locator('header a[data-source-page], footer a[data-source-page]').all()) {
        await expect(link).toHaveAttribute('href', '/request-a-quote/')
        await expect(link).toHaveAttribute('data-site-scope', 'tio2-my')
        await expect(link).toHaveAttribute('data-source-page', contract.identity.pageId)
      }
      await expect(page.locator('footer h2')).toHaveText(['Explore', 'Information', 'Procurement'])
      for (const heading of await page.locator('footer h2').all()) {
        await expect(heading).toHaveCSS('font-size', width === 390 ? '14px' : '12px')
      }
      const footerLogo = page.locator('footer img[alt="TiO2 Malaysia"]').first()
      await footerLogo.scrollIntoViewIfNeeded()
      await expect(footerLogo).toBeVisible()
      await expect.poll(() => footerLogo.evaluate((image) => {
        const element = image as HTMLImageElement
        return element.complete && element.naturalWidth > 0 && element.naturalHeight > 0
      })).toBe(true)

      const layout = await page.evaluate(() => ({
        innerWidth,
        main: (() => {
          const rect = document.querySelector('main')?.getBoundingClientRect()
          return rect ? {left: rect.left, right: rect.right, width: rect.width} : null
        })(),
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(layout.innerWidth).toBe(width)
      expect(layout.scrollWidth).toBe(width)
      expect(layout.main).not.toBeNull()
      expect(layout.main!.left).toBeGreaterThanOrEqual(0)
      expect(layout.main!.right).toBeLessThanOrEqual(width)
      expect(layout.main!.width).toBeGreaterThan(0)

      const moduleStyle = async (moduleId: string) => page.locator(`[data-module="${moduleId}"]`).evaluate((node) => {
        const style = getComputedStyle(node)
        return {backgroundColor: style.backgroundColor, borderTopWidth: style.borderTopWidth, minHeight: style.minHeight}
      })
      if (contract.identity.pageId === 'MARKET-EU-ES') {
        expect((await moduleStyle('hero')).backgroundColor).toBe('rgb(255, 255, 255)')
        await expect(page.locator('[data-module="hero"] > div')).toHaveCSS('border-left-width', '0px')
        await expect(page.locator('[data-module="applications"] section').first()).toHaveCSS('border-top-width', width === 390 ? '0px' : '0px')
      } else if (contract.identity.pageId === 'MARKET-IN-001') {
        expect((await moduleStyle('material')).backgroundColor).toBe('rgb(6, 43, 91)')
        expect(await page.locator('[data-module="hero"] > div').evaluate((node) => getComputedStyle(node, '::before').content))
          .toContain('MARKET BRIEF')
        expect(await page.locator('[data-module="documents"] > div').evaluate((node) => getComputedStyle(node, '::after').content))
          .toContain('TDS')
        if (width === 1440) expect((await page.locator('[data-module="hero"]').boundingBox())!.height).toBeGreaterThanOrEqual(560)
      } else if (contract.identity.pageId === 'MARKET-EU-NL') {
        expect((await moduleStyle('hero')).backgroundColor).toBe('rgb(255, 255, 255)')
        expect((await moduleStyle('applications')).backgroundColor).toBe('rgb(245, 248, 251)')
        await expect(page.locator('[data-module="applications"] section').first()).toHaveCSS('border-left-width', '0px')
      } else {
        expect((await moduleStyle('hero')).backgroundColor).toBe('rgb(245, 248, 251)')
        await expect(page.locator('[data-module="applications"] section').first()).toHaveCSS('border-top-width', '3px')
        await expect(page.locator('[data-module="documents"] > div > p').nth(1)).toHaveCSS('border-left-width', '3px')
      }
      for (const action of await page.locator('main a').all()) {
        const box = await action.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
        expect(box?.width).toBeGreaterThanOrEqual(44)
      }
      const axe = await new AxeBuilder({page}).analyze()
      expect(axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
      expect(remoteRequests).toEqual([])

      await page.evaluate(() => scrollTo(0, 0))
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      const bytes = await page.screenshot({
        path: `${evidenceRoot}/${slug}-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      })
      const renderedHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      const approvedHeight = approvedLogicalHeights[contract.identity.pageId][width]
      expect(Math.abs(renderedHeight - approvedHeight) / approvedHeight).toBeLessThan(0.05)
      runtimeEvidence[`${contract.identity.pageId}-${width}`] = {
        axeSeriousCritical: 0,
        approvedLogicalHeight: approvedHeight,
        height: renderedHeight,
        heightDeltaRatio: Number((Math.abs(renderedHeight - approvedHeight) / approvedHeight).toFixed(4)),
        noHorizontalOverflow: true,
        screenshotSha256: createHash('sha256').update(bytes).digest('hex'),
      }

      if (width === 390) {
        const trigger = page.getByRole('button', {name: 'Open primary navigation', exact: true})
        await trigger.click()
        const dialog = page.getByRole('dialog', {name: 'Primary navigation menu'})
        await expect(dialog).toBeVisible()
        await expect(dialog.getByRole('button', {name: 'Close primary navigation menu'})).toBeFocused()
        const current = dialog.locator('nav[aria-label="Mobile navigation"] [aria-current="page"]')
        await expect(current).toHaveText('Markets')
        expect(await current.evaluate((node) => getComputedStyle(node, '::before').width)).toBe('4px')
        await expect(dialog.locator('nav a').first()).toHaveCSS('text-align', 'left')
        await page.screenshot({
          path: `${evidenceRoot}/${slug}-390-menu-open.png`,
          fullPage: false,
          animations: 'disabled',
        })
        await page.keyboard.press('Escape')
        await expect(dialog).not.toBeVisible()
        await expect(trigger).toBeFocused()
      }
    })
  }
}

test('all four country pages reach editable scoped RFQ and document forms without submitting externally', async ({page}) => {
  for (const [slug, file] of pages) {
    const contract = loadContract(file)
    await ready(page, `/markets/${slug}/`)
    await page.locator('main a[href^="/request-a-quote/"]').first().click()
    await expect(page).toHaveURL(new RegExp(`/request-a-quote\\?`))
    await expect(page.locator('#rfq-destination_country')).toHaveValue(contract.destinationCountry)
    await page.locator('#rfq-destination_country').fill(`${contract.destinationCountry} receiving point`)
    await expect(page.locator('#rfq-destination_country')).toHaveValue(`${contract.destinationCountry} receiving point`)

    await ready(page, `/markets/${slug}/`)
    await page.locator('main a[href^="/request-documents/"]').first().click()
    expect(new URL(page.url()).pathname).toBe('/request-documents/')
    expect(new URL(page.url()).searchParams.get('source_page_id')).toBe(contract.identity.pageId)
    expect(new URL(page.url()).searchParams.get('market_id')).toBe(contract.identity.pageId)
    await expect(page.locator('[data-request-documents-field]')).toHaveCount(8)
    await expect(page.locator('#request-documents-country_region')).toHaveValue('')
  }
})

test('Spain preserves the approved typography, action geometry, hover and keyboard-focus states', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 1000})
  await ready(page, '/markets/spain/')

  await expect(page.locator('main h1')).toHaveCSS('font-weight', '650')
  for (const heading of await page.locator('main h2').all()) await expect(heading).toHaveCSS('font-weight', '650')

  const primary = page.locator('[data-module="hero"] a').filter({hasText: 'Request a Quote'})
  const secondary = page.locator('[data-module="hero"] a').filter({hasText: 'Explore Products'})
  for (const action of [primary, secondary]) {
    await expect(action).toHaveCSS('min-height', '50px')
    await expect(action).toHaveCSS('padding-top', '13px')
    await expect(action).toHaveCSS('padding-right', '24px')
  }

  await primary.hover()
  await expect(primary).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(primary).toHaveCSS('background-color', 'rgb(0, 128, 120)')
  await expect(primary).toHaveCSS('text-decoration-line', 'underline')
  await expect(primary).toHaveCSS('text-decoration-thickness', '2px')

  for (const [kind, link] of [
    ['secondary', secondary],
    ['breadcrumb', page.locator('main nav[aria-label="Breadcrumb"] a').first()],
  ] as const) {
    await link.hover()
    await expect(link).toHaveCSS('color', 'rgb(0, 128, 120)')
    await expect(link).toHaveCSS('background-color', 'rgb(245, 248, 251)')
    await expect(link).toHaveCSS('text-decoration-line', 'underline')
    await expect(link).toHaveCSS('text-decoration-thickness', '2px')
    if (kind === 'secondary') {
      const bytes = await page.screenshot({
        path: `${evidenceRoot}/spain-1440-secondary-hover.png`,
        fullPage: false,
        animations: 'disabled',
      })
      runtimeEvidence['MARKET-EU-ES-secondary-hover'] = {
        backgroundColor: 'rgb(245, 248, 251)',
        color: 'rgb(0, 128, 120)',
        screenshotSha256: createHash('sha256').update(bytes).digest('hex'),
        textDecorationLine: 'underline',
        textDecorationThickness: '2px',
      }
    }
    await link.focus()
    expect(await link.evaluate((node) => node.matches(':focus-visible'))).toBe(true)
    await expect(link).toHaveCSS('outline-offset', '3px')
  }

  await page.setViewportSize({width: 390, height: 844})
  await ready(page, '/markets/spain/')
  await expect(page.locator('[data-module="applications"] p').first()).toHaveCSS('font-size', '16px')
  await expect(page.locator('[data-module="quote"] li').first()).toHaveCSS('font-size', '16px')
})

test('India exposes every main action in forward and reverse keyboard order with visible focus', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 1000})
  await ready(page, '/markets/india/')
  const expectedHrefs = await page.locator('main a').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')))
  const forward: Array<string | null> = []
  const focusHashes: string[] = []

  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur()
    scrollTo(0, 0)
  })
  for (let step = 0; step < 80 && forward.length < expectedHrefs.length; step += 1) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null
      if (!element?.closest('main') || element.tagName !== 'A') return null
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        bottom: rect.bottom,
        href: element.getAttribute('href'),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        top: rect.top,
        viewportHeight: innerHeight,
      }
    })
    if (!focused) continue
    forward.push(focused.href)
    expect(focused.outlineStyle).toBe('solid')
    expect(focused.outlineWidth).toBe('3px')
    expect(focused.top).toBeGreaterThanOrEqual(0)
    expect(focused.bottom).toBeLessThanOrEqual(focused.viewportHeight)
    if ([0, Math.floor(expectedHrefs.length / 2), expectedHrefs.length - 1].includes(forward.length - 1)) {
      const bytes = await page.screenshot({
        path: `${evidenceRoot}/india-keyboard-focus-${String(forward.length).padStart(2, '0')}.png`,
        fullPage: false,
        animations: 'disabled',
      })
      focusHashes.push(createHash('sha256').update(bytes).digest('hex'))
    }
  }
  expect(forward).toEqual(expectedHrefs)

  const reverse: Array<string | null> = [forward.at(-1) ?? null]
  for (let step = 1; step < expectedHrefs.length; step += 1) {
    await page.keyboard.press('Shift+Tab')
    reverse.push(await page.locator('main a:focus').getAttribute('href'))
  }
  expect(reverse).toEqual([...expectedHrefs].reverse())
  runtimeEvidence['MARKET-IN-001-keyboard'] = {
    focusScreenshotSha256: focusHashes,
    forwardHrefs: forward,
    reverseHrefs: reverse,
    visibleFocus: true,
  }
})

for (const width of [1440, 768, 390] as const) {
  test(`Belgium ${width}px keeps the two BE-04 inline focus targets clear and stable`, async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000})
    await ready(page, '/markets/belgium/')
    const paragraph = page.locator('[data-module="documents"] > div > p').nth(2)
    const links = [paragraph.getByRole('link', {name: 'Product Hub'}), paragraph.getByRole('link', {name: 'quotation request'})]
    for (const [index, link] of links.entries()) {
      await link.scrollIntoViewIfNeeded()
      const before = await link.boundingBox()
      expect(before?.height).toBeGreaterThanOrEqual(44)
      expect(before?.width).toBeGreaterThanOrEqual(44)
      await expect(link).toHaveCSS('padding-left', '6px')
      await expect(link).toHaveCSS('padding-right', '6px')
      await link.focus()
      expect(await link.evaluate((node) => node.matches(':focus-visible'))).toBe(true)
      await expect(link).toHaveCSS('outline-offset', '-3px')
      const after = await link.boundingBox()
      expect(after).toEqual(before)
      await paragraph.screenshot({
        path: `${evidenceRoot}/belgium-${width}-be04-inline-${index + 1}-focus.png`,
        animations: 'disabled',
      })
    }
  })
}
