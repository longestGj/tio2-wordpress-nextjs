import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toMalaysiaRequestDocumentsPageDto} from '@/lib/wordpress/request-documents-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaRequestDocumentsPageSource} from '@/tests/fixtures/tio2-my-request-documents-page'

const routeMocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getPage: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))
vi.mock('@/lib/wordpress/request-documents-v01-queries', () => ({getMalaysiaRequestDocumentsPage: routeMocks.getPage}))

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  routeMocks.getPage.mockResolvedValue(toMalaysiaRequestDocumentsPageDto(malaysiaRequestDocumentsPageSource()))
})
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); vi.resetModules() })

describe('CONV-DOC route', () => {
  it('server-renders scoped approved fields, a static empty shell, one graph and shared Chrome', async () => {
    const route = await import('@/app/request-documents/page')
    const markup = renderToStaticMarkup(await route.default())
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup).not.toContain('value="M-2196" selected=""')
    expect(markup).not.toMatch(/<input[^>]*checked=""[^>]*value="safety"/u)
    expect(markup).not.toContain('Review your prefilled context')
    expect(markup.match(/application\/ld\+json/gu)).toHaveLength(1)
    expect(markup.match(/<header/gu)).toHaveLength(1)
    expect(markup.match(/<footer/gu)).toHaveLength(1)
    expect(markup).not.toContain('/contact')
  })

  it('rejects foreign site scope before querying WordPress', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/request-documents/page')
    await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(routeMocks.getPage).not.toHaveBeenCalled()
  })

  it('keeps metadata noindex and query-independent while contract authorization is false', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('TIO2_MY_REQUEST_DOCUMENTS_INDEXING_RELEASE_AUTHORIZED', 'true')
    const route = await import('@/app/request-documents/page')
    await expect(route.generateMetadata()).resolves.toMatchObject({
      alternates: {canonical: 'https://tio2malaysia.com/request-documents/'},
      robots: {index: false, follow: false},
    })
  })
})
