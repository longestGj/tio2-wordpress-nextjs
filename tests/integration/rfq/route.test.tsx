import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toMalaysiaRfqPageDto} from '@/lib/wordpress/rfq-page-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaRfqPageSource} from '@/tests/fixtures/tio2-my-rfq-page'

const routeMocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaRfqPage: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))
vi.mock('@/lib/wordpress/rfq-page-v01-queries', () => ({getMalaysiaRfqPage: routeMocks.getMalaysiaRfqPage}))

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  routeMocks.getMalaysiaRfqPage.mockResolvedValue(toMalaysiaRfqPageDto(malaysiaRfqPageSource()))
  vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', 'test-key')
  vi.stubEnv('TIO2_MY_PRIVACY_POLICY_HREF', '/legal/privacy-policy/')
})
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); vi.resetModules() })

describe('CONV-RFQ route', () => {
  it('renders scoped prefill, one graph and unchanged sibling routes', async () => {
    const route = await import('@/app/request-a-quote/page')
    const markup = renderToStaticMarkup(await route.default({searchParams: Promise.resolve({
      grade_id: 'M-2377', application_id: 'Coatings', process_context: 'Sulfate',
      source_page_id: 'PRODUCT-000',
    })}))
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup).toContain('value="M-2377" selected=""')
    expect(markup).toContain('Sulfate')
    expect(markup).toContain('href="/request-sample/"')
    expect(markup).toContain('href="/request-documents/"')
    expect(markup.match(/application\/ld\+json/gu)).toHaveLength(1)
    expect(markup).not.toContain('/contact')
  })

  it('rejects foreign site scope before querying WordPress', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/request-a-quote/page')
    await expect(route.default({searchParams: Promise.resolve({})})).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(routeMocks.getMalaysiaRfqPage).not.toHaveBeenCalled()
  })

  it('keeps route metadata noindex while the scoped contract authorization is false', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED', 'true')
    const route = await import('@/app/request-a-quote/page')
    await expect(route.generateMetadata()).resolves.toMatchObject({robots: {index: false, follow: false}})
  })
})
