import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getSiteConfig} from '@/sites'
import {toMalaysiaLegalPagesDto} from '@/lib/wordpress/legal-pages-v01-dto'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

const pages = toMalaysiaLegalPagesDto(approved.pages.map((page, index) => ({
  id: `legal-${index + 1}`, modifiedGmt: '2026-09-02T08:00:00', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: page.path.replace(/\/$/, '')},
  malaysiaLegalPageContractJson: JSON.stringify(page),
})))
const mocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaLegalPage: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/legal-pages-v01-queries', () => ({getMalaysiaLegalPage: mocks.getMalaysiaLegalPage}))

beforeEach(() => {
  mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  mocks.getMalaysiaLegalPage.mockImplementation(async (id: string) => pages.find((page) => page.pageId === id))
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('Legal/Privacy exact route assembly', () => {
  it.each([
    ['@/app/privacy-policy/page', 'LEGAL-PRIV-EN', 'Privacy Policy'],
    ['@/app/ms/privacy-policy/page', 'LEGAL-PRIV-MS', 'Dasar Privasi'],
    ['@/app/cookie-policy/page', 'LEGAL-COOKIE-EN', 'Cookie Policy'],
  ])('renders %s as the approved page', async (modulePath, pageId, h1) => {
    const route = modulePath.includes('/ms/') ? await import('@/app/ms/privacy-policy/page')
      : modulePath.includes('cookie') ? await import('@/app/cookie-policy/page')
      : await import('@/app/privacy-policy/page')
    const markup = renderToStaticMarkup(await route.default())
    expect(markup).toContain(`data-page-id="${pageId}"`)
    expect(markup).toContain(`<h1>${h1}</h1>`)
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(markup).not.toMatch(/terms-of-use|legal\/privacy-policy|Internal release controls/iu)
  })

  it.each([
    ['@/app/privacy-policy/page', 'Last updated: 5 September 2026', 'When you submit a Request Documents form, we collect:'],
    ['@/app/ms/privacy-policy/page', 'Kemas kini terakhir: 5 September 2026', 'Apabila anda menghantar borang Request Documents, kami mengumpul:'],
  ])('renders the V0.2 disclosure in the initial HTML for %s', async (modulePath, updated, disclosure) => {
    const route = modulePath.includes('/ms/')
      ? await import('@/app/ms/privacy-policy/page')
      : await import('@/app/privacy-policy/page')
    const markup = renderToStaticMarkup(await route.default())
    expect(markup).toContain(updated)
    expect(markup).toContain(disclosure)
    expect(markup).not.toMatch(/Internal release controls|Kawalan dalaman sebelum penerbitan/u)
  })
})
