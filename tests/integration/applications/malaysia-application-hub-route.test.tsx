import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toMalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-dto'
import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getSiteConfig} from '@/sites'
import {malaysiaApplicationHubSource} from '@/tests/fixtures/tio2-my-application-hub'

const routeMocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaApplicationHub: vi.fn(), getSiteApplication: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))
vi.mock('@/components/sites/tio2-a/site-a-brand-shell', () => ({SiteABrandShell: ({children}: {children: React.ReactNode}) => <>{children}</>}))
vi.mock('@/components/applications/application-page', () => ({ApplicationPageRenderer: () => null, isValidatedApplicationPageDto: () => true}))
vi.mock('@/lib/wordpress/application-hub-v01-queries', () => ({getMalaysiaApplicationHub: routeMocks.getMalaysiaApplicationHub}))
vi.mock('@/lib/wordpress/application-queries', () => ({getSiteApplication: routeMocks.getSiteApplication}))

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  routeMocks.getMalaysiaApplicationHub.mockResolvedValue(toMalaysiaApplicationHubDto(malaysiaApplicationHubSource()))
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('APP-000 route integration', () => {
  it('renders one scoped Malaysia hub and one exact JSON-LD graph', async () => {
    const route = await import('@/app/applications/page')
    const markup = renderToStaticMarkup(await route.default())
    expect(routeMocks.getMalaysiaApplicationHub).toHaveBeenCalledOnce()
    expect(routeMocks.getSiteApplication).not.toHaveBeenCalled()
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup.match(/<h1/gu)).toHaveLength(1)
    expect(markup).toContain('Explore Titanium Dioxide by Application')
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(markup).toContain('"numberOfItems":5')
  })

  it('emits the exact clean canonical and noindex state', async () => {
    const route = await import('@/app/applications/page')
    const metadata = await route.generateMetadata()
    expect(String(metadata.alternates?.canonical)).toBe('https://tio2malaysia.com/applications/')
    expect(metadata.robots).toMatchObject({index: false, follow: false})
  })

  it('rejects foreign scope before either CMS query', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/applications/page')
    await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(routeMocks.getMalaysiaApplicationHub).not.toHaveBeenCalled()
    expect(routeMocks.getSiteApplication).not.toHaveBeenCalled()
  })

  it('propagates missing Malaysia CMS data without fallback', async () => {
    const sourceError = new GraphQLResponseError([{message: 'Malaysia Application Hub record is unavailable.'}])
    routeMocks.getMalaysiaApplicationHub.mockRejectedValue(sourceError)
    const route = await import('@/app/applications/page')
    await expect(route.default()).rejects.toBe(sourceError)
    expect(routeMocks.getSiteApplication).not.toHaveBeenCalled()
  })
})
