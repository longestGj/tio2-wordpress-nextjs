import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaResourceHubSource} from '@/tests/fixtures/tio2-my-resource-hub'

const routeMocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(), getMalaysiaResourceHub: vi.fn(), getSiteResource: vi.fn(),
}))

vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))
vi.mock('@/components/sites/tio2-a/site-a-brand-shell', () => ({
  SiteABrandShell: ({children}: {children: React.ReactNode}) => <>{children}</>,
}))
vi.mock('@/lib/wordpress/resource-hub-v01-queries', () => ({getMalaysiaResourceHub: routeMocks.getMalaysiaResourceHub}))
vi.mock('@/lib/wordpress/resource-queries', () => ({getSiteResource: routeMocks.getSiteResource}))

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  routeMocks.getMalaysiaResourceHub.mockResolvedValue(toMalaysiaResourceHubDto(malaysiaResourceHubSource()))
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('RES-000 route integration', () => {
  it('branches before Site A lookup and renders the H0 graph', async () => {
    const route = await import('@/app/resources/page')
    const markup = renderToStaticMarkup(await route.default())
    expect(routeMocks.getMalaysiaResourceHub).toHaveBeenCalledOnce()
    expect(routeMocks.getSiteResource).not.toHaveBeenCalled()
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup.match(/<h1/gu)).toHaveLength(1)
    expect(markup).toContain('Resources for Titanium Dioxide Procurement Decisions')
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(markup).not.toContain('"@type":"ItemList"')
  })

  it('emits one exact canonical and noindex through Next Metadata', async () => {
    const route = await import('@/app/resources/page')
    const metadata = await route.generateMetadata()
    const url = new URL(String(metadata.alternates?.canonical))
    expect(url.href).toBe('https://tio2malaysia.com/resources/')
    expect(url.search + url.hash).toBe('')
    expect(metadata.robots).toMatchObject({index: false, follow: false})
  })

  it('propagates a missing Malaysia record without Site A fallback', async () => {
    const sourceError = new GraphQLResponseError([{message: 'Malaysia Resources Hub record is unavailable.'}])
    routeMocks.getMalaysiaResourceHub.mockRejectedValue(sourceError)
    const route = await import('@/app/resources/page')
    await expect(route.default()).rejects.toBe(sourceError)
    expect(routeMocks.getSiteResource).not.toHaveBeenCalled()
  })
})
