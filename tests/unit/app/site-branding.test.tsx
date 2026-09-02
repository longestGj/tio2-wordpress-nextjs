import {renderToStaticMarkup} from 'react-dom/server'
import {http, HttpResponse} from 'msw'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  graphqlEndpoint,
  makeHomepageNode,
} from '@/tests/mocks/handlers'
import {makeSiteABrandHomepageNode} from '@/tests/mocks/site-a-brand-homepage'
import {server} from '@/tests/mocks/server'

const {draftMode} = vi.hoisted(() => ({
  draftMode: vi.fn().mockResolvedValue({isEnabled: false}),
}))

vi.mock('next/headers', () => ({draftMode}))
vi.mock('next/font/google', () => ({
  Inter: () => ({variable: 'inter-font'}),
  Source_Serif_4: () => ({variable: 'source-serif-font'}),
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))

const sites = [
  {
    id: 'tio2-a',
    name: 'TIOVAR',
    locale: 'en-US',
    title: 'Titanium Dioxide Supplier & TiO2 Grades | TIOVAR',
    description:
      'TIOVAR supplies application-specific titanium dioxide grades for industrial applications.',
  },
  {
    id: 'tio2-b',
    name: 'TiO2 B',
    locale: 'en-US',
    title: 'TiO2 B | Titanium Dioxide',
    description: 'Titanium dioxide products and applications from TiO2 B.',
  },
] as const

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('site branding', () => {
  it.each(sites)('renders $id metadata and branding', async (site) => {
    vi.stubEnv('SITE_ID', site.id)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', graphqlEndpoint)
    const homepage = site.id === 'tio2-a'
      ? makeSiteABrandHomepageNode()
      : makeHomepageNode(site.id)
    Reflect.set(homepage.homepageFields!, 'heroHeading', `${site.name} Home`)
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {tio2Homepage: homepage},
          extensions: {debug: []},
        }),
      ),
    )

    const {default: RootLayout, metadata} = await import('@/app/layout')
    const {default: HomePage} = await import('@/app/page')

    expect(metadata.title).toBe(site.title)
    expect(metadata.description).toBe(site.description)
    const layoutMarkup = renderToStaticMarkup(
      await RootLayout({children: <main>Child</main>}),
    )
    if (site.id === 'tio2-a') {
      expect(layoutMarkup).toContain(
        `<html lang="${site.locale}"><head></head><body><main>Child</main>`,
      )
      expect(layoutMarkup).not.toContain('<header>')
    } else {
      expect(layoutMarkup).toContain(
        `<html lang="${site.locale}"><head></head><body><header>${site.name}</header>`,
      )
    }

    const homeMarkup = renderToStaticMarkup(await HomePage())
    expect(homeMarkup).toContain(`data-site-id="${site.id}"`)
    if (site.id === 'tio2-a') {
      expect(homeMarkup).toContain(`alt="${site.name}"`)
      expect(homeMarkup.match(/<header(?:\s|>)/gu)).toHaveLength(1)
      expect(homeMarkup).not.toContain(`<p>${site.name}</p>`)
    } else {
      expect(homeMarkup).toContain(`<p>${site.name}</p>`)
      expect(homeMarkup).not.toContain('<header>')
    }
    expect(homeMarkup).toContain(
      `<h1 id="${site.id === 'tio2-a' ? 'tiovar-hero-heading' : 'homepage-hero-heading'}">${site.name} Home</h1>`,
    )
  })
})
