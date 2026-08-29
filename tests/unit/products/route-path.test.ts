import {describe, expect, it} from 'vitest'

import {resolveProductPageIdentity} from '@/lib/products/page-graph'
import {
  productPathFromSegments,
  productSegmentsFromPath,
} from '@/lib/products/route-path'

describe('Product route path', () => {
  it.each([
    [[], '/products'],
    [['coatings'], '/products/coatings'],
    [['coatings', 'tp-c120'], '/products/coatings/tp-c120'],
  ] as const)('builds the canonical path for %j', (segments, expected) => {
    expect(productPathFromSegments(segments)).toBe(expected)
  })

  it.each([
    ['/products', []],
    ['/products/coatings', ['coatings']],
    ['/products/coatings/tp-c120', ['coatings', 'tp-c120']],
  ] as const)('parses the canonical path %s', (path, expected) => {
    expect(productSegmentsFromPath(path)).toEqual(expected)
  })

  it.each([
    [['Coatings']],
    [['coatings', 'TP-C120']],
    [['unknown-family']],
    [['coatings', 'tp-p100']],
    [['coatings', 'tp-c120', 'extra']],
    [['coatings', 'tp-c120%2Fextra']],
    [['coatings/tp-c120']],
    [['..']],
  ] as const)('rejects non-canonical segments %j', (segments) => {
    expect(productPathFromSegments(segments)).toBeNull()
  })

  it.each([
    '/products/',
    '/products/Coatings',
    '/products/coatings/TP-C120',
    '/products/unknown-family',
    '/products/plastics-masterbatch/tp-c120',
    '/products/coatings/tp-c120/extra',
    '/products/coatings/tp-c120%2Fextra',
    '/products/../coatings',
    '/products/tp-c120',
  ])('rejects the non-canonical path %s', (path) => {
    expect(productSegmentsFromPath(path)).toBeNull()
    expect(resolveProductPageIdentity(path)).toBeNull()
  })
})
