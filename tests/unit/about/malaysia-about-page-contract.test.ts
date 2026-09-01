import {describe, expect, it} from 'vitest'

import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-page.json'

describe('ABOUT-001 approved contract', () => {
  it('freezes identity, module copy, route fallbacks and media register', () => {
    expect(approvedContract.identity).toMatchObject({pageId: 'ABOUT-001', siteScope: 'tio2-my', path: '/about/'})
    expect(approvedContract.hero.h1).toBe('Malaysia-Based Titanium Dioxide Supply for Global Markets')
    expect(approvedContract.markets.items).toHaveLength(4)
    expect(new Set(approvedContract.markets.items.map(({href}) => href))).toEqual(new Set(['/markets/']))
    expect(approvedContract.applications.items).toHaveLength(4)
    expect(new Set(approvedContract.applications.items.map(({href}) => href))).toEqual(new Set(['/applications/']))
    expect(approvedContract.media).toHaveLength(12)
    expect(approvedContract.media.every(({method}) => method === 'HTML_CSS_SVG_REBUILD')).toBe(true)
    expect(JSON.stringify(approvedContract)).not.toMatch(/legalName|AggregateRating|Offer|FAQPage|QAPage/u)
  })
})
