import {describe, expect, it} from 'vitest'

import {applicationPathFromSegments} from '@/lib/applications/route-path'

describe('applicationPathFromSegments', () => {
  it.each([
    [['coatings'], '/applications/coatings'],
    [
      ['coatings', 'water-based-paint'],
      '/applications/coatings/water-based-paint',
    ],
  ] as const)('normalizes %j to %s', (segments, expected) => {
    expect(applicationPathFromSegments(segments)).toBe(expected)
  })

  it.each([
    [[]],
    [['..']],
    [['coatings', '']],
    [['coatings', 'Water-Based-Paint']],
    [['coatings', 'water-based-paint', 'extra']],
  ] as const)('rejects unsafe segments %j', (segments) => {
    expect(applicationPathFromSegments(segments)).toBeNull()
  })
})
