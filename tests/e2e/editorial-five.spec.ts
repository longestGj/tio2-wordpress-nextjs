import {test, expect, type Page} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {createHash} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {JSDOM} from 'jsdom'
import type {EditorialContract} from '../../lib/editorial/editorial-types'

const ids = ['MARKET-EU-DE', 'MARKET-EU-IT', 'PRODUCT-PROC-SU', 'RES-R706', 'RES-CHEMOURS'] as const
const contracts = ids.map(id => JSON.parse(readFileSync(`wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${id.toLowerCase()}.json`, 'utf8')) as EditorialContract)
const base = process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3236'
const cmsUrl = process.env.FIVE_WORDPRESS_GRAPHQL_URL ?? 'http://127.0.0.1:8187/graphql'
const evidenceRoot = resolve(process.env.FIVE_EVIDENCE_DIR ?? 'docs/verification/tio2-my/de-it-su-r706-chemours-20260908/evidence/five-browser/currentbuild')
const normalize = (value: string | null | undefined) => (value ?? '').replace(/\s+/gu, ' ').trim()
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
let buildId = ''
let cmsToken = ''

test.beforeAll(() => {
  expect(process.env.FIVE_RUNTIME_READY, 'Parent must verify the intended runtime before this suite runs').toBe('1')
  expect(['localhost', '127.0.0.1']).toContain(new URL(base).hostname)
  expect(['localhost', '127.0.0.1']).toContain(new URL(cmsUrl).hostname)
  expect(process.env.FIVE_NEXT_DIST_DIR, 'Exact build directory is required').toBeTruthy()
  buildId = readFileSync(resolve(process.env.FIVE_NEXT_DIST_DIR!, 'BUILD_ID'), 'utf8').trim()
  cmsToken = process.env.WORDPRESS_EDITORIAL_API_TOKEN ?? ''
  if (!cmsToken && process.env.FIVE_WORDPRESS_ENV_FILE) {
    const line = readFileSync(process.env.FIVE_WORDPRESS_ENV_FILE, 'utf8').split(/\r?\n/u)
      .find(value => value.startsWith('WORDPRESS_EDITORIAL_API_TOKEN='))
    cmsToken = line?.slice('WORDPRESS_EDITORIAL_API_TOKEN='.length) ?? ''
  }
  expect(cmsToken, 'Read-only editorial API credential is required').toBeTruthy()
  mkdirSync(evidenceRoot, {recursive: true})
})

async function capture(page: Page, filename: string, fullPage = false) {
  const bytes = await page.screenshot({path: resolve(evidenceRoot, filename), fullPage, animations: 'disabled'})
  return {filename, sha256: hash(bytes), kind: fullPage ? 'full-page' : 'viewport', actualVisualReview: 'PENDING'}
}

for (const contract of contracts) {
  test(`${contract.identity.pageId} real CMS, SSR, three-width visuals and shared interactions`, async ({page, request}, testInfo) => {
    test.setTimeout(240_000)
    const id = contract.identity.pageId
    const captures: unknown[] = []
    const consoleEvents: unknown[] = []
    const pageErrors: string[] = []
    const blockedRequests: unknown[] = []
    const networkFailures: unknown[] = []
    const destinations: unknown[] = []
    const states: unknown[] = []
    let cmsEvidence: unknown = null
    page.on('console', message => {if (['warning', 'error'].includes(message.type())) consoleEvents.push({type: message.type(), text: message.text()})})
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('requestfailed', failed => networkFailures.push({url: failed.url(), reason: failed.failure()?.errorText}))
    // This suite never submits forms. Block unexpected writes and external page resources.
    await page.route('**/*', async intercepted => {
      const incoming = intercepted.request()
      const url = new URL(incoming.url())
      if (!['GET', 'HEAD'].includes(incoming.method()) || !['localhost', '127.0.0.1'].includes(url.hostname)) {
        blockedRequests.push({url: incoming.url(), method: incoming.method()})
        await intercepted.abort()
      } else await intercepted.continue()
    })
    try {
      const cmsResponse = await request.post(cmsUrl, {headers: {'x-tio2-editorial-token': cmsToken}, data: {
        query: 'query($pageId:String!,$siteScope:String!){malaysiaEditorialRecordJson(pageId:$pageId,siteScope:$siteScope)}',
        variables: {pageId: id, siteScope: 'tio2-my'},
      }})
      expect(cmsResponse.status()).toBe(200)
      const cmsEnvelope = await cmsResponse.json()
      expect(cmsEnvelope.errors).toBeUndefined()
      const cms = JSON.parse(cmsEnvelope.data.malaysiaEditorialRecordJson)
      expect(cms.recordPageId).toBe(id)
      expect(cms.siteScopes.nodes.map((node: {slug: string}) => node.slug)).toEqual(['tio2-my'])
      expect(JSON.parse(cms.editorialContractJson)).toEqual(contract)
      cmsEvidence = {url: cmsUrl, id: cms.id, recordPageId: cms.recordPageId, status: cms.status, publishingFields: cms.publishingFields, siteScopes: cms.siteScopes, contractSha256: hash(cms.editorialContractJson), availableGradePaths: cms.availableGradePaths, unavailableInternalPaths: cms.unavailableInternalPaths}

      const response = await page.goto(`${base}${contract.identity.path}?grade_id=M-996&source_page_id=probe&probe=canonical`, {waitUntil: 'networkidle'})
      expect(response?.status()).toBe(200)
      const html = await response!.text()
      expect(html).toContain(buildId)
      const dom = new JSDOM(html).window.document
      const expected = new JSDOM(`<main>${contract.bodyHtml}</main>`).window.document
      expect(normalize(dom.querySelector('main')?.textContent)).toBe(normalize(expected.querySelector('main')?.textContent))
      expect(dom.querySelector('main h1')?.textContent).toBe(contract.heading)
      expect(dom.querySelectorAll('main > section')).toHaveLength(id.startsWith('MARKET-') ? 7 : id === 'PRODUCT-PROC-SU' ? 5 : 6)
      expect(dom.title).toBe(contract.seo.title)
      expect(dom.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(contract.seo.metaDescription)
      expect(dom.querySelector('meta[name="robots"]')?.getAttribute('content')).toMatch(/noindex.*nofollow/u)
      expect([...dom.querySelectorAll('link[rel="canonical"]')].map(node => node.getAttribute('href'))).toEqual(contract.seo.canonical ? [contract.seo.canonical] : [])
      expect(dom.querySelector('html')?.lang).toBe('en')
      expect(dom.querySelector('main form,main script,main style')).toBeNull()
      expect(normalize(dom.querySelector('main')?.textContent)).not.toMatch(/Gate [0-9]|site_scope|APPROVED_FOR_HANDOFF|TIOVAR|TITAN branding/u)
      const links = [...dom.querySelectorAll('main a')].map(anchor => ({label: normalize(anchor.textContent), href: anchor.getAttribute('href')}))
      expect(links).toEqual([...expected.querySelectorAll('main a')].map(anchor => ({label: normalize(anchor.textContent), href: anchor.getAttribute('href')})))
      const graphs = [...dom.querySelectorAll('script[type="application/ld+json"]')].map(script => JSON.parse(script.textContent!))
      const graph = graphs.flatMap(value => value['@graph'] ?? [value])
      if (id === 'PRODUCT-PROC-SU') {
        expect(graph.map(node => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList'])
        const list = graph.find(node => node['@type'] === 'ItemList')
        expect(list.numberOfItems).toBe(5)
        expect(list.itemListElement.map((item: {position: number; url?: string; item?: {url?: string} | string}) => [item.position, item.url ?? (typeof item.item === 'string' ? item.item : item.item?.url)])).toEqual(
          ['m-996', 'm-2196', 'm-108', 'm-52', 'm-2377'].map((slug, index) => [index + 1, `https://tio2malaysia.com/products/${slug}/`]))
        expect([...dom.querySelectorAll('.grades h3')].map(node => node.textContent)).toEqual(['M-996', 'M-2196', 'M-108', 'M-52', 'M-2377'])
      } else if (id.startsWith('MARKET-')) expect(graph.map(node => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
      else {
        expect(graph).toEqual([]) // Candidate mapping/schema acceptance remains explicitly deferred.
        expect(dom.querySelector('main a[href^="/products/m-"]')).toBeNull()
        for (const link of links.filter(link => link.href?.startsWith('/') && !link.href.startsWith('//'))) expect(new URL(link.href!, base).search).toBe('')
      }
      for (const link of links.filter(link => link.href?.startsWith('/request-'))) {
        const url = new URL(link.href!, base)
        if (id === 'PRODUCT-PROC-SU') expect([...url.searchParams]).toEqual([['source_page_id', id]])
        else if (id.startsWith('MARKET-')) {
          expect(url.searchParams.get('source_page_id')).toBe(id)
          expect([...url.searchParams.keys()].sort()).toEqual(url.pathname === '/request-a-quote/' ? ['destination_country', 'source_page_id'] : ['source_page_id'])
          if (url.pathname === '/request-a-quote/') expect(url.searchParams.get('destination_country')).toBe(id === 'MARKET-EU-DE' ? 'Germany' : 'Italy')
        }
      }
      writeFileSync(resolve(evidenceRoot, `${id}-initial.html`), html)
      writeFileSync(resolve(evidenceRoot, `${id}-head-links-schema.json`), JSON.stringify({title: dom.title, links, graph, robots: dom.querySelector('meta[name="robots"]')?.getAttribute('content'), canonical: contract.seo.canonical}, null, 2))

      const fontSession = await page.context().newCDPSession(page)
      await fontSession.send('DOM.enable')
      await fontSession.send('CSS.enable')
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({width, height: width === 390 ? 844 : 900})
        await page.evaluate(() => document.fonts.ready)
        // Native lazy images below the fold must load before a full-page capture.
        await page.locator('footer').scrollIntoViewIfNeeded()
        await expect.poll(() => page.locator('footer img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
        await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); scrollTo(0, 0) })
        await page.mouse.move(1, 1)
        const geometry = await page.evaluate(() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, dpr: devicePixelRatio, mainFont: getComputedStyle(document.querySelector('main')!).fontFamily, headerHeight: document.querySelector('header')!.getBoundingClientRect().height}))
        expect.soft(geometry.scrollWidth).toBeLessThanOrEqual(width + 1)
        expect.soft(geometry.dpr).toBe(1)
        expect.soft(geometry.headerHeight).toBe(width === 1440 ? 84 : 64)
        const fontDocument = await fontSession.send('DOM.getDocument')
        const headingNode = await fontSession.send('DOM.querySelector', {nodeId: fontDocument.root.nodeId, selector: 'main h1'})
        const renderedFonts = await fontSession.send('CSS.getPlatformFontsForNode', {nodeId: headingNode.nodeId})
        expect.soft(renderedFonts.fonts.some(font => font.isCustomFont && font.familyName.includes('Inter') && font.glyphCount > 0)).toBe(true)
        states.push({width, geometry, renderedFonts: renderedFonts.fonts})
        captures.push(await capture(page, `${id}-${width}-full.png`, true))
        const current = id.startsWith('MARKET-') ? 'Markets' : id === 'PRODUCT-PROC-SU' ? 'Products' : 'Resources'
        if (width === 1440) {
          await expect(page.getByRole('navigation', {name: 'Primary navigation', exact: true}).locator('[aria-current="page"]')).toHaveText(current)
        } else {
          const trigger = page.locator('header button[aria-controls="malaysia-mobile-menu"]')
          await trigger.focus(); await page.keyboard.press('Enter')
          const menu = page.getByRole('navigation', {name: 'Mobile navigation', exact: true})
          await expect(menu).toBeVisible()
          await expect(menu.locator('[aria-current="page"]')).toHaveText(current)
          await expect(page.getByRole('navigation', {name: 'Primary navigation', exact: true})).toHaveCount(0)
          const focusable = menu.locator('a[href]:visible')
          await expect(focusable.first()).toBeFocused()
          await page.keyboard.press('Shift+Tab'); await expect(trigger).toBeFocused()
          await page.keyboard.press('Shift+Tab'); await expect(focusable.last()).toBeFocused()
          await page.keyboard.press('Tab'); await expect(trigger).toBeFocused()
          await page.keyboard.press('Tab'); await expect(focusable.first()).toBeFocused()
          captures.push(await capture(page, `${id}-${width}-menu.png`))
          await page.keyboard.press('Escape'); await expect(menu).not.toBeVisible(); await expect(trigger).toBeFocused()
        }
        // Reach a real main link through keyboard movement and capture visible focus.
        await page.locator('main a').first().focus(); await page.keyboard.press('Tab')
        const focused = await page.evaluate(() => {const element = document.activeElement as HTMLElement; const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); return {text: element.textContent, href: element.getAttribute('href'), visible: element.matches(':focus-visible'), outline: style.outlineStyle, width: style.outlineWidth, top: rect.top, bottom: rect.bottom}})
        expect.soft(focused.visible).toBe(true)
        expect.soft(focused.outline).not.toBe('none')
        captures.push(await capture(page, `${id}-${width}-keyboard-focus.png`))
        states.push({width, focused})
        const cookieTrigger = page.getByRole('button', {name: 'Cookie Settings', exact: true})
        await cookieTrigger.focus(); await page.keyboard.press('Enter')
        const cookie = page.getByRole('dialog', {name: 'Cookie settings', exact: true})
        await expect(cookie).toBeVisible()
        const cookieHeading = await cookie.evaluate(dialog => {
          const heading = dialog.querySelector('h2')!
          const color = getComputedStyle(heading).color
          const background = getComputedStyle(dialog).backgroundColor
          const luminance = (value: string) => value.match(/[\d.]+/gu)!.slice(0, 3).map(Number).map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0)
          const foregroundLuminance = luminance(color), backgroundLuminance = luminance(background)
          return {text: heading.textContent, color, background, font: getComputedStyle(heading).fontFamily, contrast: (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)}
        })
        states.push({width, cookieHeading})
        expect.soft(cookieHeading.contrast, 'Cookie dialog heading must be legible against its surface').toBeGreaterThanOrEqual(3)
        const cookieAxe = await new AxeBuilder({page}).analyze()
        writeFileSync(resolve(evidenceRoot, `${id}-${width}-cookie-axe.json`), JSON.stringify(cookieAxe.violations, null, 2))
        expect.soft(cookieAxe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
        const cookieFocus = cookie.locator('button,a[href]')
        await expect(cookieFocus.first()).toBeFocused()
        await page.keyboard.press('Shift+Tab'); await expect(cookieFocus.last()).toBeFocused()
        await page.keyboard.press('Tab'); await expect(cookieFocus.first()).toBeFocused()
        captures.push(await capture(page, `${id}-${width}-cookie.png`))
        await page.keyboard.press('Escape'); await expect(cookieTrigger).toBeFocused()
        await expect(page.getByRole('link', {name: 'Terms', exact: true})).toHaveCount(0)
        const axe = await new AxeBuilder({page}).analyze()
        writeFileSync(resolve(evidenceRoot, `${id}-${width}-axe.json`), JSON.stringify(axe.violations, null, 2))
        expect.soft(axe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
      }
      await fontSession.detach()
      for (const anchor of await page.locator('main a[href^="#"]').all()) {
        const target = (await anchor.getAttribute('href'))!.slice(1)
        await anchor.focus(); await page.keyboard.press('Enter')
        expect(await page.evaluate(() => document.activeElement?.id)).toBe(target)
        captures.push(await capture(page, `${id}-anchor-${target}.png`))
        await page.goto(`${base}${contract.identity.path}#${target}`, {waitUntil: 'networkidle'})
        expect(await page.locator(`#${target}`).evaluate(element => {const rect = element.getBoundingClientRect();return rect.top >= 0 && rect.top < innerHeight})).toBe(true)
      }
      for (const path of [...new Set(links.map(link => link.href).filter((href): href is string => !!href?.startsWith('/') && !href.startsWith('//')))]) {
        try {
          const target = await request.get(base + path)
          const targetDom = new JSDOM(await target.text()).window.document
          destinations.push({path, status: target.status(), actualUrl: target.url(), siteScope: targetDom.querySelector('[data-site-scope]')?.getAttribute('data-site-scope') ?? null, heading: targetDom.querySelector('h1')?.textContent ?? null, disposition: target.status() === 200 ? 'RESPONSE_OBSERVED_NOT_RELEASE_APPROVAL' : 'OPEN_DEPENDENCY'})
        } catch (error) {destinations.push({path, disposition: 'OPEN_DEPENDENCY', error: String(error)})}
      }
      expect.soft(pageErrors).toEqual([])
      expect.soft(blockedRequests).toEqual([])
    } finally {
      writeFileSync(resolve(evidenceRoot, `${id}-runtime.json`), JSON.stringify({id, time: new Date().toISOString(), buildId, base, source: contract.source, cms: cmsEvidence, captures, states, destinations, consoleEvents, pageErrors, blockedRequests, networkFailures, failures: testInfo.errors.map(error => error.message), coverage: {browser: testInfo.project.name, viewports: '1440x900,768x900,390x844 DPR1', nativeZoom: 'NOT_TESTED', realDevice: 'NOT_TESTED', screenReader: 'NOT_TESTED', externalSources: 'NOT_TESTED', realFormSubmission: 'NOT_PERFORMED', screenshotReview: 'PENDING'}}, null, 2))
    }
  })
}

test('five candidate routes remain absent from sitemap', async ({request}) => {
  const response = await request.get(`${base}/sitemap.xml`)
  expect(response.status()).toBe(200)
  const xml = await response.text()
  for (const contract of contracts) expect(xml).not.toContain(`https://tio2malaysia.com${contract.identity.path}`)
  writeFileSync(resolve(evidenceRoot, 'indexing.json'), JSON.stringify({time: new Date().toISOString(), buildId, status: response.status(), allFiveAbsent: true, indexingAuthorized: false}, null, 2))
})
