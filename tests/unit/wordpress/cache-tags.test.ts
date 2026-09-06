import {describe, expect, it} from 'vitest'

import {
  aboutPageVersionTag,
  contentListTag,
  contentTag,
  documentReachContentTag,
  entityTag,
  normalizePublicPath,
  requestSampleContentTag,
  routeTag,
  siteTag,
  sitemapTag,
} from '@/lib/wordpress/cache-tags'

describe('WordPress cache tags', () => {
  it('builds stable site-specific tags', () => {
    expect(siteTag('tio2-a')).toBe('site:tio2-a')
    expect(contentListTag('tio2-a')).toBe('content-list:tio2-a')
    expect(sitemapTag('tio2-a')).toBe('sitemap:tio2-a')
    expect(contentTag('tio2-a', 42)).toBe('content:tio2-a:42')
    expect(routeTag('tio2-b', '/applications/coatings')).toBe(
      'route:tio2-b:/applications/coatings',
    )
    expect(routeTag('tio2-b', '/applications/coatings/')).toBe(
      'route:tio2-b:/applications/coatings',
    )
    expect(entityTag('tio2-b', 7)).toBe('entity:tio2-b:7')
    expect(siteTag('tio2-my')).toBe('site:tio2-my')
    expect(contentListTag('tio2-my')).toBe('content-list:tio2-my')
    expect(sitemapTag('tio2-my')).toBe('sitemap:tio2-my')
    expect(routeTag('tio2-my', '/')).toBe('route:tio2-my:/')
    expect(requestSampleContentTag('tio2-my')).toBe('content:tio2-my--request-sample')
    expect(documentReachContentTag('tio2-my')).toBe('content:tio2-my--document-reach')
    expect(() => documentReachContentTag('tio2-a')).toThrow('Invalid DOC-REACH scope')
    expect(() => requestSampleContentTag('tio2-a')).toThrow('Invalid Request Sample scope')
    expect(aboutPageVersionTag('tio2-my', 'ABOUT-001-G7-PCR-02:FACTS-V0.1')).toBe(
      'content-version:tio2-my:ABOUT-001-G7-PCR-02:FACTS-V0.1',
    )
    expect(() => aboutPageVersionTag('tio2-my', 'draft')).toThrow('Invalid Malaysia About content version')
  })

  it.each([
    ['/', '/'],
    ['/products', '/products'],
    ['/products/', '/products'],
    ['/applications/coatings/', '/applications/coatings'],
  ])('normalizes valid route path %j to %j', (path, expected) => {
    expect(normalizePublicPath(path)).toBe(expected)
  })

  it('applies the canonical 172-character bound after trailing-slash normalization', () => {
    const maximumPath = `/${'a'.repeat(171)}`

    expect(normalizePublicPath(maximumPath)).toBe(maximumPath)
    expect(normalizePublicPath(`${maximumPath}/`)).toBe(maximumPath)
    expect(() => normalizePublicPath(`/${'a'.repeat(172)}`)).toThrow(
      'Invalid public path',
    )
  })

  it.each(['', 'unknown', 'TIO2-A'])('rejects invalid site ID %j', (siteId) => {
    expect(() => siteTag(siteId)).toThrow('Invalid site ID')
  })

  it.each([0, -1, 1.5, Number.NaN])('rejects invalid content ID %j', (id) => {
    expect(() => contentTag('tio2-a', id)).toThrow('Invalid content ID')
  })

  it.each([0, -1, 1.5, Number.NaN])('rejects invalid entity ID %j', (id) => {
    expect(() => entityTag('tio2-a', id)).toThrow('Invalid entity ID')
  })

  it.each([
    '',
    'products',
    '//example.test/products',
    'https://example.test/products',
    '/products?draft=1',
    '/products#details',
    '/Products',
    '/bad path',
    '/double--hyphen',
    '/-leading-hyphen',
    '/trailing-hyphen-',
    '/products//',
    '/products/../admin',
    '/products/%2e%2e/admin',
    '/products\\admin',
  ])('rejects invalid route path %j', (path) => {
    expect(() => normalizePublicPath(path)).toThrow('Invalid public path')
    expect(() => routeTag('tio2-a', path)).toThrow('Invalid public path')
  })
})
