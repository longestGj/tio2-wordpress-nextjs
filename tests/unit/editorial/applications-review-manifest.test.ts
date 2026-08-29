import {describe, expect, it} from 'vitest'

import {
  assertOnlyApprovedApplicationChanges,
  mergeApprovedApplicationRepresentatives,
} from '../../../scripts/editorial/applications-review-manifest.mjs'

const approvedIds = ['applications-hub', 'coatings', 'water-based-paint'] as const

function record(id: string, marker: string) {
  return {identity: {id}, marker}
}

describe('Applications review manifest guard', () => {
  it('replaces exactly the three approved representatives without changing canonical order', () => {
    const canonical = {
      version: '0.1',
      siteId: 'tio2-a',
      records: [
        record('applications-hub', 'old-hub'),
        record('coatings', 'old-category'),
        record('plastics', 'untouched'),
        record('water-based-paint', 'old-detail'),
      ],
    }
    const representatives = {
      version: '0.1',
      siteId: 'tio2-a',
      records: [
        record('applications-hub', 'approved-hub'),
        record('coatings', 'approved-category'),
        record('water-based-paint', 'approved-detail'),
      ],
    }

    expect(
      mergeApprovedApplicationRepresentatives(
        canonical,
        representatives,
        approvedIds,
      ).records,
    ).toEqual([
      record('applications-hub', 'approved-hub'),
      record('coatings', 'approved-category'),
      record('plastics', 'untouched'),
      record('water-based-paint', 'approved-detail'),
    ])
  })

  it.each([
    {
      name: 'a missing representative',
      ids: ['applications-hub', 'coatings'],
    },
    {
      name: 'an extra representative',
      ids: [...approvedIds, 'plastics'],
    },
  ])('rejects $name before creating a runtime manifest', ({ids}) => {
    const canonical = {
      version: '0.1',
      siteId: 'tio2-a',
      records: [...approvedIds, 'plastics'].map((id) => record(id, 'canonical')),
    }
    const representatives = {
      version: '0.1',
      siteId: 'tio2-a',
      records: ids.map((id) => record(id, 'approved')),
    }

    expect(() =>
      mergeApprovedApplicationRepresentatives(
        canonical,
        representatives,
        approvedIds,
      ),
    ).toThrow(/exact approved identity set/i)
  })

  it('accepts no-change dependencies and only create or update actions for the three approved Applications', () => {
    const plan = {
      actions: [
        {entityType: 'application', id: 'applications-hub', action: 'update'},
        {entityType: 'application', id: 'coatings', action: 'create'},
        {entityType: 'application', id: 'water-based-paint', action: 'update'},
        {entityType: 'application', id: 'plastics', action: 'no-change'},
        {entityType: 'resource', id: 'article-01', action: 'no-change'},
        {entityType: 'product', id: 'TP-C120', action: 'no-change'},
      ],
    }

    expect(
      assertOnlyApprovedApplicationChanges(plan, approvedIds),
    ).toEqual(['applications-hub', 'coatings', 'water-based-paint'])
  })

  it.each([
    {entityType: 'application', id: 'plastics', action: 'update'},
    {entityType: 'resource', id: 'article-01', action: 'create'},
    {entityType: 'product', id: 'TP-C120', action: 'update'},
  ])('rejects an out-of-scope planned change: $entityType/$id', (unsafeAction) => {
    const plan = {
      actions: [
        {entityType: 'application', id: 'applications-hub', action: 'update'},
        {entityType: 'application', id: 'coatings', action: 'update'},
        {entityType: 'application', id: 'water-based-paint', action: 'update'},
        unsafeAction,
      ],
    }

    expect(() =>
      assertOnlyApprovedApplicationChanges(plan, approvedIds),
    ).toThrow(/outside the three-page review scope/i)
  })
})
