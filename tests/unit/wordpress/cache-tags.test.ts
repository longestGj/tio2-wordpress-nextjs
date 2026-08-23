import {describe, expect, it} from 'vitest'

import {
  contentTag,
  entityTag,
  routeTag,
  siteTag,
} from '@/lib/wordpress/cache-tags'

describe('WordPress cache tags', () => {
  it('builds stable site-specific tags', () => {
    expect(siteTag('tio2-a')).toBe('site:tio2-a')
    expect(contentTag('tio2-a', 42)).toBe('content:tio2-a:42')
    expect(routeTag('tio2-b', '/applications/coatings')).toBe(
      'route:tio2-b:/applications/coatings',
    )
    expect(entityTag('tio2-b', 7)).toBe('entity:tio2-b:7')
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
    '/products/../admin',
    '/products/%2e%2e/admin',
    '/products\\admin',
  ])('rejects invalid route path %j', (path) => {
    expect(() => routeTag('tio2-a', path)).toThrow('Invalid public path')
  })
})
