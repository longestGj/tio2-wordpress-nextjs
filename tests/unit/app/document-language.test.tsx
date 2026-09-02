import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getSiteConfig} from '@/sites'

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  getCurrentSite: vi.fn(),
}))

vi.mock('next/headers', () => ({headers: mocks.headers}))
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
    ['ms-MY', 'ms-MY'],
    ['en', 'en'],
    ['untrusted-language', 'en'],
    [null, 'en'],
  ])('renders a trusted %s request language as html lang=%s', async (requestLanguage, expectedLanguage) => {
    mocks.headers.mockResolvedValue(new Headers(
      requestLanguage ? [['x-tio2-my-document-language', requestLanguage]] : [],
    ))
    const {default: RootLayout} = await import('@/app/layout')
    const markup = renderToStaticMarkup(await RootLayout({children: <main>Child</main>}))

    expect(markup).toContain(`<html lang="${expectedLanguage}">`)
  })
})
