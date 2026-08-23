import {renderToStaticMarkup} from 'react-dom/server'
import {http, HttpResponse} from 'msw'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  graphqlEndpoint,
  makeContentPageNode,
} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

const {draftMode} = vi.hoisted(() => ({
  draftMode: vi.fn().mockResolvedValue({isEnabled: false}),
}))

vi.mock('next/headers', () => ({draftMode}))

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
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', graphqlEndpoint)
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {
            page: makeContentPageNode({
              title: `${site.name} Home`,
              content: `<p>${site.name} home content.</p>`,
              publishingFields: {
                __typename: 'PublishingFields',
                publicPath: '/',
                seoTitle: `${site.name} Home`,
                seoDescription: `${site.name} home description.`,
              },
              siteScopes: {
                __typename: 'PageToSiteScopeConnection',
                nodes: [
                  {
                    __typename: 'SiteScope',
                    id: site.id === 'tio2-a' ? 'dGVybTox' : 'dGVybToy',
                    slug: site.id,
                  },
                ],
              },
            }),
          },
          extensions: {debug: []},
        }),
      ),
    )

    const {default: RootLayout, metadata} = await import('@/app/layout')
    const {default: HomePage} = await import('@/app/page')

    expect(metadata.title).toBe(site.title)
    expect(metadata.description).toBe(site.description)
    expect(renderToStaticMarkup(<RootLayout><main>Child</main></RootLayout>)).toContain(
      `<html lang="${site.locale}"><head></head><body><header>${site.name}</header>`,
    )

    const homeMarkup = renderToStaticMarkup(await HomePage())
    expect(homeMarkup).toContain(`data-site-id="${site.id}"`)
    expect(homeMarkup).toContain(`<p>${site.name}</p>`)
    expect(homeMarkup).toContain(`<h1>${site.name} Home</h1>`)
  })
})
