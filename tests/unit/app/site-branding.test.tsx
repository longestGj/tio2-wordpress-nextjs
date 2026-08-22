import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, describe, expect, it, vi} from 'vitest'

const sites = [
  {
    id: 'tio2-a',
    name: 'TiO2 A',
    locale: 'en-US',
    title: 'TiO2 A | Titanium Dioxide',
    description: 'Titanium dioxide products and applications from TiO2 A.',
  },
  {
    id: 'tio2-b',
    name: 'TiO2 B',
    locale: 'en-US',
    title: 'TiO2 B | Titanium Dioxide',
    description: 'Titanium dioxide products and applications from TiO2 B.',
  },
]

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('site branding', () => {
  it.each(sites)('renders $id metadata and branding', async (site) => {
    vi.stubEnv('SITE_ID', site.id)

    const {default: RootLayout, metadata} = await import('@/app/layout')
    const {default: HomePage} = await import('@/app/page')

    expect(metadata.title).toBe(site.title)
    expect(metadata.description).toBe(site.description)
    expect(renderToStaticMarkup(<RootLayout><main>Child</main></RootLayout>)).toContain(
      `<html lang="${site.locale}"><head></head><body><header>${site.name}</header>`,
    )

    const homeMarkup = renderToStaticMarkup(<HomePage />)
    expect(homeMarkup).toContain(`<h1>${site.name}</h1>`)
    expect(homeMarkup).toContain(`<p>Site ID: ${site.id}</p>`)
  })
})
