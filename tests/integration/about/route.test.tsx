import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toMalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-dto'
import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getSiteConfig} from '@/sites'
import {malaysiaAboutPageSource} from '@/tests/fixtures/tio2-my-about-page'

const routeMocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaAboutPage: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))
vi.mock('@/lib/wordpress/about-page-v01-queries', () => ({getMalaysiaAboutPage: routeMocks.getMalaysiaAboutPage}))

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  routeMocks.getMalaysiaAboutPage.mockResolvedValue(toMalaysiaAboutPageDto(malaysiaAboutPageSource()))
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('ABOUT-001 route', () => {
  it('renders one scoped page and one exact JSON-LD graph', async () => {
    const route = await import('@/app/about/page')
    const markup = renderToStaticMarkup(await route.default())
    expect(routeMocks.getMalaysiaAboutPage).toHaveBeenCalledOnce()
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(markup).toContain('"@type":"AboutPage"')
  })

  it('rejects foreign scopes before query and propagates missing-record errors', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    let route = await import('@/app/about/page')
    await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(routeMocks.getMalaysiaAboutPage).not.toHaveBeenCalled()

    vi.resetModules()
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
    const sourceError = new GraphQLResponseError([{message: 'The Malaysia About page record is missing.'}])
    routeMocks.getMalaysiaAboutPage.mockRejectedValue(sourceError)
    route = await import('@/app/about/page')
    await expect(route.default()).rejects.toBe(sourceError)
  })
})
