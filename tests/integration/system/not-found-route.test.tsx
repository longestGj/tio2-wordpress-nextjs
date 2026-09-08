import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getSiteConfig} from '@/sites'

const routeMocks = vi.hoisted(() => ({getCurrentSite: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))

beforeEach(() => { routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my')) })
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('SYS-404 route boundary', () => {
  it('renders the Malaysia recovery page and exact non-canonical metadata', async () => {
    const route = await import('@/app/[...path]/not-found')
    const markup = renderToStaticMarkup(route.default())
    expect(markup).toContain('data-page-id="SYS-404"')
    expect(markup).toContain('Let’s help you find what you need.')
    expect(route.generateMetadata()).toEqual({title: 'Page Not Found | TiO2 Malaysia', robots: 'noindex, follow'})
  })

  it('does not project Malaysia content or metadata into another site', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/[...path]/not-found')
    const markup = renderToStaticMarkup(route.default())
    expect(markup).toContain('This page could not be found.')
    expect(markup).not.toContain('TiO2 Malaysia')
    expect(route.generateMetadata()).toEqual({})
  })
})
