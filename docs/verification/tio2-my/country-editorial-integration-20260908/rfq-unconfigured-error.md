# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: country-markets.spec.ts >> all four country pages reach editable scoped RFQ and document forms without submitting externally
- Location: tests\e2e\country-markets.spec.ts:289:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: locator('#rfq-destination_country')
Expected: "Spain"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for locator('#rfq-destination_country')

```

```yaml
- banner:
  - link "TiO2 Malaysia home":
    - /url: /
    - img "TiO2 Malaysia"
  - navigation "Primary navigation":
    - link "Home":
      - /url: /
    - link "Markets":
      - /url: /markets/
    - link "Products":
      - /url: /products/
    - link "Applications":
      - /url: /applications/
    - link "Documents":
      - /url: /documents/
    - link "Resources":
      - /url: /resources/
    - link "About":
      - /url: /about/
  - link "Request a Quote":
    - /url: /request-a-quote/
- main:
  - navigation "Breadcrumb":
    - link "Home":
      - /url: /
    - text: Request a Quote
  - region "Request a Titanium Dioxide Quote":
    - paragraph: B2B QUOTATION REQUEST
    - heading "Request a Titanium Dioxide Quote" [level=1]
    - paragraph: Tell us the product, application, quantity and destination you are evaluating. Our team will review your requirements and prepare the appropriate commercial response.
  - region "Quotation request details":
    - heading "Quotation request details" [level=2]
    - paragraph: Required fields are marked. Please use business information and avoid confidential formulations, account credentials, payment details or sensitive personal information.
    - status:
      - heading "The quotation request form is temporarily unavailable." [level=3]
      - paragraph: No request has been submitted. Please return later and try again.
  - complementary "Other request types":
    - heading "Other request types" [level=2]
    - paragraph: Use the separate request form when you need a sample review or controlled document request instead of a quotation.
    - link "Request a Sample":
      - /url: /request-sample/
    - link "Request Documents":
      - /url: /request-documents/
- contentinfo:
  - img "TiO2 Malaysia"
  - paragraph: A focused titanium dioxide purchasing platform for international industrial buyers.
  - navigation "Footer explore navigation":
    - heading "Explore" [level=2]
    - link "Home":
      - /url: /
    - link "Markets":
      - /url: /markets/
    - link "Products":
      - /url: /products/
    - link "Applications":
      - /url: /applications/
  - navigation "Footer information navigation":
    - heading "Information" [level=2]
    - link "Documents":
      - /url: /documents/
    - link "Resources":
      - /url: /resources/
    - link "About":
      - /url: /about/
  - heading "Procurement" [level=2]
  - link "Request a Quote":
    - /url: /request-a-quote/
  - navigation "Legal and privacy navigation":
    - link "Privacy Policy":
      - /url: /privacy-policy/
    - link "Dasar Privasi (BM)":
      - /url: /ms/privacy-policy/
    - link "Cookie Policy":
      - /url: /cookie-policy/
    - button "Cookie Settings"
  - paragraph: © 2026 TiO2 Malaysia.
- alert
```

# Test source

```ts
  195 |         const element = image as HTMLImageElement
  196 |         return element.complete && element.naturalWidth > 0 && element.naturalHeight > 0
  197 |       })).toBe(true)
  198 |
  199 |       const layout = await page.evaluate(() => ({
  200 |         innerWidth,
  201 |         main: (() => {
  202 |           const rect = document.querySelector('main')?.getBoundingClientRect()
  203 |           return rect ? {left: rect.left, right: rect.right, width: rect.width} : null
  204 |         })(),
  205 |         scrollWidth: document.documentElement.scrollWidth,
  206 |       }))
  207 |       expect(layout.innerWidth).toBe(width)
  208 |       expect(layout.scrollWidth).toBe(width)
  209 |       expect(layout.main).not.toBeNull()
  210 |       expect(layout.main!.left).toBeGreaterThanOrEqual(0)
  211 |       expect(layout.main!.right).toBeLessThanOrEqual(width)
  212 |       expect(layout.main!.width).toBeGreaterThan(0)
  213 |
  214 |       const moduleStyle = async (moduleId: string) => page.locator(`[data-module="${moduleId}"]`).evaluate((node) => {
  215 |         const style = getComputedStyle(node)
  216 |         return {backgroundColor: style.backgroundColor, borderTopWidth: style.borderTopWidth, minHeight: style.minHeight}
  217 |       })
  218 |       if (contract.identity.pageId === 'MARKET-EU-ES') {
  219 |         expect((await moduleStyle('hero')).backgroundColor).toBe('rgb(255, 255, 255)')
  220 |         await expect(page.locator('[data-module="hero"] > div')).toHaveCSS('border-left-width', '0px')
  221 |         await expect(page.locator('[data-module="applications"] section').first()).toHaveCSS('border-top-width', width === 390 ? '0px' : '0px')
  222 |       } else if (contract.identity.pageId === 'MARKET-IN-001') {
  223 |         expect((await moduleStyle('material')).backgroundColor).toBe('rgb(6, 43, 91)')
  224 |         expect(await page.locator('[data-module="hero"] > div').evaluate((node) => getComputedStyle(node, '::before').content))
  225 |           .toContain('MARKET BRIEF')
  226 |         expect(await page.locator('[data-module="documents"] > div').evaluate((node) => getComputedStyle(node, '::after').content))
  227 |           .toContain('TDS')
  228 |         if (width === 1440) expect((await page.locator('[data-module="hero"]').boundingBox())!.height).toBeGreaterThanOrEqual(560)
  229 |       } else if (contract.identity.pageId === 'MARKET-EU-NL') {
  230 |         expect((await moduleStyle('hero')).backgroundColor).toBe('rgb(255, 255, 255)')
  231 |         expect((await moduleStyle('applications')).backgroundColor).toBe('rgb(245, 248, 251)')
  232 |         await expect(page.locator('[data-module="applications"] section').first()).toHaveCSS('border-left-width', '0px')
  233 |       } else {
  234 |         expect((await moduleStyle('hero')).backgroundColor).toBe('rgb(245, 248, 251)')
  235 |         await expect(page.locator('[data-module="applications"] section').first()).toHaveCSS('border-top-width', '3px')
  236 |         await expect(page.locator('[data-module="documents"] > div > p').nth(1)).toHaveCSS('border-left-width', '3px')
  237 |       }
  238 |       for (const action of await page.locator('main a').all()) {
  239 |         const box = await action.boundingBox()
  240 |         expect(box?.height).toBeGreaterThanOrEqual(44)
  241 |         expect(box?.width).toBeGreaterThanOrEqual(44)
  242 |       }
  243 |       const axe = await new AxeBuilder({page}).analyze()
  244 |       expect(axe.violations.filter(({impact}) => impact === 'serious' || impact === 'critical')).toEqual([])
  245 |       expect(remoteRequests).toEqual([])
  246 |
  247 |       await page.evaluate(() => scrollTo(0, 0))
  248 |       await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  249 |       const bytes = await page.screenshot({
  250 |         path: `${evidenceRoot}/${slug}-${width}.png`,
  251 |         fullPage: true,
  252 |         animations: 'disabled',
  253 |       })
  254 |       const renderedHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  255 |       const approvedHeight = approvedLogicalHeights[contract.identity.pageId][width]
  256 |       expect(Math.abs(renderedHeight - approvedHeight) / approvedHeight).toBeLessThan(0.05)
  257 |       runtimeEvidence[`${contract.identity.pageId}-${width}`] = {
  258 |         axeSeriousCritical: 0,
  259 |         approvedLogicalHeight: approvedHeight,
  260 |         height: renderedHeight,
  261 |         heightDeltaRatio: Number((Math.abs(renderedHeight - approvedHeight) / approvedHeight).toFixed(4)),
  262 |         noHorizontalOverflow: true,
  263 |         screenshotSha256: createHash('sha256').update(bytes).digest('hex'),
  264 |       }
  265 |
  266 |       if (width === 390) {
  267 |         const trigger = page.getByRole('button', {name: 'Open primary navigation', exact: true})
  268 |         await trigger.click()
  269 |         const dialog = page.getByRole('dialog', {name: 'Primary navigation menu'})
  270 |         await expect(dialog).toBeVisible()
  271 |         await expect(dialog.getByRole('button', {name: 'Close primary navigation menu'})).toBeFocused()
  272 |         const current = dialog.locator('nav[aria-label="Mobile navigation"] [aria-current="page"]')
  273 |         await expect(current).toHaveText('Markets')
  274 |         expect(await current.evaluate((node) => getComputedStyle(node, '::before').width)).toBe('4px')
  275 |         await expect(dialog.locator('nav a').first()).toHaveCSS('text-align', 'left')
  276 |         await page.screenshot({
  277 |           path: `${evidenceRoot}/${slug}-390-menu-open.png`,
  278 |           fullPage: false,
  279 |           animations: 'disabled',
  280 |         })
  281 |         await page.keyboard.press('Escape')
  282 |         await expect(dialog).not.toBeVisible()
  283 |         await expect(trigger).toBeFocused()
  284 |       }
  285 |     })
  286 |   }
  287 | }
  288 |
  289 | test('all four country pages reach editable scoped RFQ and document forms without submitting externally', async ({page}) => {
  290 |   for (const [slug, file] of pages) {
  291 |     const contract = loadContract(file)
  292 |     await ready(page, `/markets/${slug}/`)
  293 |     await page.locator('main a[href^="/request-a-quote/"]').first().click()
  294 |     await expect(page).toHaveURL(new RegExp(`/request-a-quote\\?`))
> 295 |     await expect(page.locator('#rfq-destination_country')).toHaveValue(contract.destinationCountry)
      |                                                            ^ Error: expect(locator).toHaveValue(expected) failed
  296 |     await page.locator('#rfq-destination_country').fill(`${contract.destinationCountry} receiving point`)
  297 |     await expect(page.locator('#rfq-destination_country')).toHaveValue(`${contract.destinationCountry} receiving point`)
  298 |
  299 |     await ready(page, `/markets/${slug}/`)
  300 |     await page.locator('main a[href^="/request-documents/"]').first().click()
  301 |     expect(new URL(page.url()).pathname).toBe('/request-documents/')
  302 |     expect(new URL(page.url()).searchParams.get('source_page_id')).toBe(contract.identity.pageId)
  303 |     expect(new URL(page.url()).searchParams.get('market_id')).toBe(contract.identity.pageId)
  304 |     await expect(page.locator('[data-request-documents-field]')).toHaveCount(8)
  305 |     await expect(page.locator('#request-documents-country_region')).toHaveValue('')
  306 |   }
  307 | })
  308 |
  309 | test('Spain preserves the approved typography, action geometry, hover and keyboard-focus states', async ({page}) => {
  310 |   await page.setViewportSize({width: 1440, height: 1000})
  311 |   await ready(page, '/markets/spain/')
  312 |
  313 |   await expect(page.locator('main h1')).toHaveCSS('font-weight', '650')
  314 |   for (const heading of await page.locator('main h2').all()) await expect(heading).toHaveCSS('font-weight', '650')
  315 |
  316 |   const primary = page.locator('[data-module="hero"] a').filter({hasText: 'Request a Quote'})
  317 |   const secondary = page.locator('[data-module="hero"] a').filter({hasText: 'Explore Products'})
  318 |   for (const action of [primary, secondary]) {
  319 |     await expect(action).toHaveCSS('min-height', '50px')
  320 |     await expect(action).toHaveCSS('padding-top', '13px')
  321 |     await expect(action).toHaveCSS('padding-right', '24px')
  322 |   }
  323 |
  324 |   await primary.hover()
  325 |   await expect(primary).toHaveCSS('color', 'rgb(255, 255, 255)')
  326 |   await expect(primary).toHaveCSS('background-color', 'rgb(0, 128, 120)')
  327 |   await expect(primary).toHaveCSS('text-decoration-line', 'underline')
  328 |   await expect(primary).toHaveCSS('text-decoration-thickness', '2px')
  329 |
  330 |   for (const [kind, link] of [
  331 |     ['secondary', secondary],
  332 |     ['breadcrumb', page.locator('main nav[aria-label="Breadcrumb"] a').first()],
  333 |   ] as const) {
  334 |     await link.hover()
  335 |     await expect(link).toHaveCSS('color', 'rgb(0, 128, 120)')
  336 |     await expect(link).toHaveCSS('background-color', 'rgb(245, 248, 251)')
  337 |     await expect(link).toHaveCSS('text-decoration-line', 'underline')
  338 |     await expect(link).toHaveCSS('text-decoration-thickness', '2px')
  339 |     if (kind === 'secondary') {
  340 |       const bytes = await page.screenshot({
  341 |         path: `${evidenceRoot}/spain-1440-secondary-hover.png`,
  342 |         fullPage: false,
  343 |         animations: 'disabled',
  344 |       })
  345 |       runtimeEvidence['MARKET-EU-ES-secondary-hover'] = {
  346 |         backgroundColor: 'rgb(245, 248, 251)',
  347 |         color: 'rgb(0, 128, 120)',
  348 |         screenshotSha256: createHash('sha256').update(bytes).digest('hex'),
  349 |         textDecorationLine: 'underline',
  350 |         textDecorationThickness: '2px',
  351 |       }
  352 |     }
  353 |     await link.focus()
  354 |     expect(await link.evaluate((node) => node.matches(':focus-visible'))).toBe(true)
  355 |     await expect(link).toHaveCSS('outline-offset', '3px')
  356 |   }
  357 |
  358 |   await page.setViewportSize({width: 390, height: 844})
  359 |   await ready(page, '/markets/spain/')
  360 |   await expect(page.locator('[data-module="applications"] p').first()).toHaveCSS('font-size', '16px')
  361 |   await expect(page.locator('[data-module="quote"] li').first()).toHaveCSS('font-size', '16px')
  362 | })
  363 |
  364 | test('India exposes every main action in forward and reverse keyboard order with visible focus', async ({page}) => {
  365 |   await page.setViewportSize({width: 1440, height: 1000})
  366 |   await ready(page, '/markets/india/')
  367 |   const expectedHrefs = await page.locator('main a').evaluateAll((links) =>
  368 |     links.map((link) => link.getAttribute('href')))
  369 |   const forward: Array<string | null> = []
  370 |   const focusHashes: string[] = []
  371 |
  372 |   await page.evaluate(() => {
  373 |     (document.activeElement as HTMLElement | null)?.blur()
  374 |     scrollTo(0, 0)
  375 |   })
  376 |   for (let step = 0; step < 80 && forward.length < expectedHrefs.length; step += 1) {
  377 |     await page.keyboard.press('Tab')
  378 |     const focused = await page.evaluate(() => {
  379 |       const element = document.activeElement as HTMLElement | null
  380 |       if (!element?.closest('main') || element.tagName !== 'A') return null
  381 |       const rect = element.getBoundingClientRect()
  382 |       const style = getComputedStyle(element)
  383 |       return {
  384 |         bottom: rect.bottom,
  385 |         href: element.getAttribute('href'),
  386 |         outlineStyle: style.outlineStyle,
  387 |         outlineWidth: style.outlineWidth,
  388 |         top: rect.top,
  389 |         viewportHeight: innerHeight,
  390 |       }
  391 |     })
  392 |     if (!focused) continue
  393 |     forward.push(focused.href)
  394 |     expect(focused.outlineStyle).toBe('solid')
  395 |     expect(focused.outlineWidth).toBe('3px')
```