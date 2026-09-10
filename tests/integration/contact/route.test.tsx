import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getSiteConfig} from '@/sites'
import {toMalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-dto'
import {malaysiaContactPageSource} from '@/tests/fixtures/tio2-my-contact-page'

const mocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaContactPage: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/contact-page-v01-queries', () => ({getMalaysiaContactPage: mocks.getMalaysiaContactPage}))

beforeEach(() => {
  mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  mocks.getMalaysiaContactPage.mockResolvedValue(toMalaysiaContactPageDto(malaysiaContactPageSource()))
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('CONTACT-001 route', () => {
  it('renders the scoped page and exactly one JSON-LD graph', async () => {
    const route = await import('@/app/contact/page')
    const html = renderToStaticMarkup(await route.default())
    expect(mocks.getMalaysiaContactPage).toHaveBeenCalledOnce()
    expect(html).toContain('data-page-id="CONTACT-001"')
    expect(html.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(html).toContain('"@type":"ContactPage"')
  })

  it('rejects a foreign runtime before querying Contact content', async () => {
    mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/contact/page')
    await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(mocks.getMalaysiaContactPage).not.toHaveBeenCalled()
  })
})
