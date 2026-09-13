import {expect, test} from '@playwright/test'

import {requiredLocalUrl} from './support/required-local-url'

const baseUrl = requiredLocalUrl('TIO2_MY_BASE_URL').origin
const consentKey = 'tio2_my_consent_v1'
const measurementCookie = '_ga_QDHLMRH2WB'

test.beforeEach(async ({context, page}) => {
  await context.clearCookies()
  await page.addInitScript((key) => window.localStorage.removeItem(key), consentKey)
  await page.route('https://www.googletagmanager.com/gtm.js**', (route) =>
    route.fulfill({status: 200, contentType: 'application/javascript', body: '/* deterministic Gate 8 fixture */'}))
})

test('loads the Malaysia GTM container after all-denied defaults without a direct Google tag', async ({page}) => {
  const googleRequests: string[] = []
  page.on('request', (request) => {
    if (/google-analytics|googletagmanager|doubleclick/iu.test(request.url())) googleRequests.push(request.url())
  })

  const response = await page.goto(`${baseUrl}/`, {waitUntil: 'networkidle'})
  expect(response?.status()).toBe(200)
  await expect(page.locator('script#tio2-my-gtm-loader')).toHaveAttribute(
    'src',
    'https://www.googletagmanager.com/gtm.js?id=GTM-MWQVK7J4',
  )
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0)

  const state = await page.evaluate(() => {
    const entries = (window.dataLayer ?? []).map((entry) => {
      const array = Array.from(entry as unknown as ArrayLike<unknown>)
      return array.length ? array : entry
    })
    return {
      entries,
      consent: window.__TIO2_SHARED_CONSENT__,
      stored: window.localStorage.getItem('tio2_my_consent_v1'),
      cookies: document.cookie,
    }
  })
  const firstDefault = state.entries.findIndex((entry) => Array.isArray(entry) && entry[0] === 'consent' && entry[1] === 'default')
  const gtmStart = state.entries.findIndex((entry) => !Array.isArray(entry) && (entry as {event?: string}).event === 'gtm.js')
  expect(firstDefault).toBeGreaterThanOrEqual(0)
  expect(gtmStart).toBeGreaterThan(firstDefault)
  expect((state.entries[firstDefault] as unknown[])[2]).toEqual({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  expect(state.consent).toEqual({siteScope: 'tio2-my', analytics: 'denied'})
  expect(state.stored).toBeNull()
  expect(state.cookies).not.toMatch(/(?:^|;\s*)_ga(?:=|_QDHLMRH2WB=)/u)
  expect(googleRequests.filter((url) => /\/gtm\.js\?id=GTM-MWQVK7J4/iu.test(url))).toHaveLength(1)
  expect(googleRequests.filter((url) => /\/gtag\/js/iu.test(url))).toEqual([])
})

test('persists Necessary/Accept choices and withdrawal removes only Malaysia GA cookies', async ({page}) => {
  await page.goto(`${baseUrl}/cookie-policy/`, {waitUntil: 'networkidle'})
  const trigger = page.locator('footer').getByRole('button', {name: 'Cookie Settings'})

  await trigger.click()
  const dialog = page.getByRole('dialog', {name: 'Analytics preferences'})
  await expect(dialog).toContainText('Analytics — Off by default.')
  await dialog.getByRole('button', {name: 'Necessary only'}).click()
  let state = await page.evaluate((key) => ({
    record: JSON.parse(window.localStorage.getItem(key) ?? 'null') as Record<string, unknown> | null,
    consent: window.__TIO2_SHARED_CONSENT__,
  }), consentKey)
  expect(Object.keys(state.record ?? {}).sort()).toEqual(['choice', 'consent_version', 'decided_at', 'site_scope'])
  expect(state.record).toMatchObject({site_scope: 'tio2-my', consent_version: 'ga4-active-v1', choice: 'necessary_only'})
  expect(state.record?.decided_at).toMatch(/^\d{4}-\d{2}-\d{2}T/u)
  expect(state.consent).toEqual({siteScope: 'tio2-my', analytics: 'denied'})

  await trigger.click()
  await dialog.getByRole('button', {name: 'Accept analytics'}).click()
  state = await page.evaluate((key) => ({
    record: JSON.parse(window.localStorage.getItem(key) ?? 'null') as Record<string, unknown> | null,
    consent: window.__TIO2_SHARED_CONSENT__,
  }), consentKey)
  expect(state.record).toMatchObject({site_scope: 'tio2-my', consent_version: 'ga4-active-v1', choice: 'analytics_accepted'})
  expect(state.consent).toEqual({siteScope: 'tio2-my', analytics: 'granted'})

  await page.evaluate((propertyCookie) => {
    document.cookie = '_ga=GA1.1.gate8; Path=/'
    document.cookie = `${propertyCookie}=GS1.1.gate8; Path=/`
    document.cookie = 'necessary_fixture=keep; Path=/'
  }, measurementCookie)
  await trigger.click()
  await dialog.getByRole('button', {name: 'Necessary only'}).click()
  const withdrawn = await page.evaluate((key) => ({
    record: JSON.parse(window.localStorage.getItem(key) ?? 'null') as Record<string, unknown> | null,
    cookies: document.cookie,
    consentCommands: (window.dataLayer ?? []).map((entry) => Array.from(entry as unknown as ArrayLike<unknown>))
      .filter((entry) => entry[0] === 'consent'),
  }), consentKey)
  expect(withdrawn.record).toMatchObject({site_scope: 'tio2-my', consent_version: 'ga4-active-v1', choice: 'necessary_only'})
  expect(withdrawn.cookies).not.toContain('_ga=')
  expect(withdrawn.cookies).not.toContain(`${measurementCookie}=`)
  expect(withdrawn.cookies).toContain('necessary_fixture=keep')
  expect(withdrawn.consentCommands.at(-1)).toEqual(['consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  }])
})
