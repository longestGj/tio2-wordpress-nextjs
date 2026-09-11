import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {RootPageHero} from '@/components/sites/tio2-my/root-page-hero/root-page-hero'

describe('RootPageHero', () => {
  it('renders the shared structural contract with content before actions and media', () => {
    const markup = renderToStaticMarkup(
      <RootPageHero
        pageId="HOME-001"
        variant="flagship-light"
        moduleName="hero"
        eyebrow="FOR INTERNATIONAL INDUSTRIAL BUYERS"
        heading="Malaysia Titanium Dioxide for Industrial Buyers"
        intro={<p>Approved buyer introduction.</p>}
        actions={<><a href="/request-a-quote/">Request a Quote</a><a href="/products/">View Products</a></>}
        media={<img src="/hero.png" alt="" />}
      />,
    )

    expect(markup).toContain('data-root-page-hero="true"')
    expect(markup).not.toContain('HOME-001')
    expect(markup).toContain('data-module="hero"')
    expect(markup).toContain('data-hero-variant="flagship-light"')
    expect(markup).not.toContain('aria-label="Breadcrumb"')
    expect(markup.indexOf('Approved buyer introduction.')).toBeLessThan(markup.indexOf('Request a Quote'))
    expect(markup.indexOf('Request a Quote')).toBeLessThan(markup.indexOf('<img'))
  })

  it('renders the six root-page breadcrumb outside the shared Hero shell', () => {
    const markup = renderToStaticMarkup(
      <RootPageHero
        pageId="RES-000"
        variant="hub-dark"
        breadcrumbLabel="Resources"
        breadcrumbModuleName="breadcrumb"
        eyebrow="RESEARCH & PROCUREMENT"
        heading="Resources for Titanium Dioxide Procurement"
        intro={<p>Approved buyer introduction.</p>}
        actions={<a href="#research-paths">Explore Procurement Resources</a>}
      />,
    )

    expect(markup).toContain('aria-label="Breadcrumb"')
    expect(markup).toContain('Home')
    expect(markup).toContain('Resources')
    expect(markup.indexOf('aria-label="Breadcrumb"')).toBeLessThan(markup.indexOf('data-root-page-hero="true"'))
  })
})
