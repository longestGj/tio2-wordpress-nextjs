import {describe, expect, it} from 'vitest'

import {validateSiteAApplicationManifest} from '@/lib/applications/content-manifest'
import representatives from '@/tests/fixtures/editorial/site-a-applications.approved-representatives.json'

describe('approved Application representatives', () => {
  it('contains only the three approved masters and passes the authoritative contract', () => {
    const manifest = validateSiteAApplicationManifest(representatives, {
      allowIncomplete: true,
    })

    expect(manifest.records.map(({identity}) => identity.id)).toEqual([
      'applications-hub',
      'coatings',
      'water-based-paint',
    ])
    expect(manifest.records.map(({hero}) => hero.headline)).toEqual([
      'Titanium Dioxide Applications',
      'Titanium Dioxide for Coatings',
      'Titanium Dioxide for Water-Based Paint',
    ])
  })

  it('preserves the approved Product hierarchy', () => {
    const manifest = validateSiteAApplicationManifest(representatives, {
      allowIncomplete: true,
    })
    const category = manifest.records.find(({identity}) => identity.id === 'coatings')
    const detail = manifest.records.find(({identity}) => identity.id === 'water-based-paint')

    expect(category?.startingProducts).toHaveLength(10)
    expect(category?.startingProducts.every(({role}) => role === 'candidate')).toBe(true)
    expect(detail?.startingProducts.map(({productId, role}) => [productId, role])).toEqual([
      ['TP-C120', 'primary'],
      ['TP-C100', 'alternative'],
      ['TP-C110', 'alternative'],
    ])
  })
})
