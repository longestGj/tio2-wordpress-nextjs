import {describe, expect, it} from 'vitest'

import {
  TIO2_MY_PUBLICATION_INVENTORY,
  getTio2MyIndexablePages,
  getTio2MyPublicationPage,
} from '@/lib/seo/tio2-my-publication-inventory'

describe('TiO2 Malaysia Gate 6 publication inventory', () => {
  it('contains 59 unique objects and exactly 57 indexable sitemap pages', () => {
    expect(TIO2_MY_PUBLICATION_INVENTORY).toHaveLength(59)
    expect(new Set(TIO2_MY_PUBLICATION_INVENTORY.map((page) => page.pageId)).size).toBe(59)

    const indexable = getTio2MyIndexablePages()
    expect(indexable).toHaveLength(57)
    expect(indexable.every((page) => page.indexingAuthorized && page.sitemapAuthorized)).toBe(true)
    expect(indexable.every((page) => page.robots === 'index, follow')).toBe(true)
  })

  it('keeps SYS-404 and CONV-THANK as the only search exceptions', () => {
    const exceptions = TIO2_MY_PUBLICATION_INVENTORY.filter(
      (page) => !page.indexingAuthorized || !page.sitemapAuthorized,
    )
    expect(exceptions.map((page) => page.pageId)).toEqual(['SYS-404', 'CONV-THANK'])

    expect(getTio2MyPublicationPage('SYS-404')).toMatchObject({
      pathname: null,
      expectedStatus: 404,
      robots: 'noindex, follow',
      canonical: null,
      sitemapAuthorized: false,
    })
    expect(getTio2MyPublicationPage('CONV-THANK')).toMatchObject({
      pathname: '/thank-you/',
      expectedStatus: 200,
      robots: 'noindex, nofollow',
      canonical: 'https://tio2malaysia.com/thank-you/',
      sitemapAuthorized: false,
    })
  })

  it('uses self-canonical, normalized public paths without query strings or fragments', () => {
    const routable = TIO2_MY_PUBLICATION_INVENTORY.filter((page) => page.pathname !== null)
    expect(new Set(routable.map((page) => page.pathname)).size).toBe(58)

    for (const page of routable) {
      expect(page.siteScope).toBe('tio2-my')
      expect(page.pathname).toMatch(/^\/(?:.*\/)?$/)
      expect(page.pathname).not.toMatch(/[?#]/)
      expect(page.canonical).toBe(new URL(page.pathname!, 'https://tio2malaysia.com').href)
    }
  })

  it('records both approved reciprocal locale relationships', () => {
    expect(getTio2MyPublicationPage('MARKET-BR-EN')?.localeRelation).toEqual({
      locale: 'en', alternatePageId: 'MARKET-BR-PT', hreflang: 'en', alternateHreflang: 'pt-BR',
    })
    expect(getTio2MyPublicationPage('MARKET-BR-PT')?.localeRelation).toEqual({
      locale: 'pt-BR', alternatePageId: 'MARKET-BR-EN', hreflang: 'pt-BR', alternateHreflang: 'en',
    })
    expect(getTio2MyPublicationPage('LEGAL-PRIV-EN')?.localeRelation?.alternatePageId).toBe('LEGAL-PRIV-MS')
    expect(getTio2MyPublicationPage('LEGAL-PRIV-MS')?.localeRelation?.alternatePageId).toBe('LEGAL-PRIV-EN')
  })

  it('preserves approved keyword and factual boundary markers', () => {
    expect(getTio2MyPublicationPage('MARKET-000')?.primaryKeyword).toBe('NO_PRIMARY_KEYWORD')
    expect(getTio2MyPublicationPage('DOC-COO')?.exceptionDirective).toBe(
      'UNVERIFIED_SHIPMENT_OR_CERTIFICATE_CLAIMS_MUST_NOT_RENDER',
    )
  })
})
