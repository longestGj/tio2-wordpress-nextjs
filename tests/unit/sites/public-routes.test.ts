import {describe, expect, it} from 'vitest'
import {
  getExpectedPublicUrlCount,
  getPublicRoutes,
  isPublicRoute,
  parsePublicRouteInventory,
} from '@/sites/public-routes'
import type {PublicRouteDefinition} from '@/sites/types'

describe('public route inventory', () => {
  it.each([
    ['tio2-a', 'site-a-homepage-active'],
    ['tio2-b', 'site-b-homepage-v0.1-frozen'],
  ] as const)('maps %s root to %s', (siteId, template) => {
    expect(getPublicRoutes(siteId)).toEqual([{path: '/', template}])
    expect(getExpectedPublicUrlCount(siteId)).toBe(1)
    expect(isPublicRoute(siteId, '/')).toBe(true)
  })

  it('keeps returned route definitions immutable', () => {
    const routes = getPublicRoutes('tio2-a')

    expect(() => (routes as PublicRouteDefinition[]).push({path: '/', template: 'site-a-homepage-active'})).toThrow(TypeError)
    expect(() => Object.assign(routes[0], {template: 'site-b-homepage-v0.1-frozen'})).toThrow(TypeError)
    expect(getPublicRoutes('tio2-a')).toEqual([{path: '/', template: 'site-a-homepage-active'}])
  })

  it('accepts only the canonical root slash', () => {
    expect(isPublicRoute('tio2-a', '/')).toBe(true)
    expect(isPublicRoute('tio2-a', '')).toBe(false)
    expect(isPublicRoute('tio2-a', '//')).toBe(false)
    expect(isPublicRoute('tio2-a', '/products')).toBe(false)
  })

  it('rejects an unknown site and an unknown route', () => {
    expect(() => getPublicRoutes('unknown' as never)).toThrow('Unknown site ID: unknown')
    expect(isPublicRoute('tio2-a', '/unknown')).toBe(false)
  })

  it('rejects duplicate paths instead of authorizing an ambiguous route', () => {
    expect(() => parsePublicRouteInventory({
      version: 'root-only-v0.1',
      sites: {
        'tio2-a': {
          expectedPublicUrls: 2,
          routes: [
            {path: '/', template: 'site-a-homepage-active'},
            {path: '/', template: 'site-a-homepage-active'},
          ],
        },
        'tio2-b': {expectedPublicUrls: 1, routes: [{path: '/', template: 'site-b-homepage-v0.1-frozen'}]},
      },
    })).toThrow('Duplicate public route for tio2-a: /')
  })

  it('rejects expected-count drift', () => {
    expect(() => parsePublicRouteInventory({
      version: 'root-only-v0.1',
      sites: {
        'tio2-a': {expectedPublicUrls: 2, routes: [{path: '/', template: 'site-a-homepage-active'}]},
        'tio2-b': {expectedPublicUrls: 1, routes: [{path: '/', template: 'site-b-homepage-v0.1-frozen'}]},
      },
    })).toThrow('Expected public URL count mismatch for tio2-a')
  })

  it('rejects a homepage template that belongs to the other site', () => {
    expect(() => parsePublicRouteInventory({
      version: 'root-only-v0.1',
      sites: {
        'tio2-a': {expectedPublicUrls: 1, routes: [{path: '/', template: 'site-b-homepage-v0.1-frozen'}]},
        'tio2-b': {expectedPublicUrls: 1, routes: [{path: '/', template: 'site-b-homepage-v0.1-frozen'}]},
      },
    })).toThrow('Homepage template does not belong to tio2-a')
  })

  it('rejects any inventory that expands beyond the one root route', () => {
    expect(() => parsePublicRouteInventory({
      version: 'root-only-v0.1',
      sites: {
        'tio2-a': {
          expectedPublicUrls: 2,
          routes: [
            {path: '/', template: 'site-a-homepage-active'},
            {path: '/products', template: 'site-a-homepage-active'},
          ],
        },
        'tio2-b': {expectedPublicUrls: 1, routes: [{path: '/', template: 'site-b-homepage-v0.1-frozen'}]},
      },
    })).toThrow('Public route inventory must contain exactly one root route for tio2-a')
  })
})
