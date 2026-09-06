import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getSiteConfig} from '@/sites'

const mocks = vi.hoisted(() => ({getCurrentSite: vi.fn()}))

vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: mocks.getCurrentSite}))

beforeEach(() => {
  mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('TiO2 Malaysia document language', () => {
  it.each([
    ['@/app/layout', 'en'],
    ['@/app/ms/layout', 'ms-MY'],
  ])('renders %s with a build-time html language of %s', async (modulePath, expectedLanguage) => {
    const layoutModule = modulePath.includes('/ms/')
      ? await import('@/app/ms/layout')
      : await import('@/app/layout')
    const markup = renderToStaticMarkup(layoutModule.default({children: <main>Child</main>}))
    expect(markup).toContain(`<html lang="${expectedLanguage}">`)
  })
})
