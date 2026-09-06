import {describe, expect, it} from 'vitest'
import {assertSiteRfqHref, getSiteConfig, SITE_IDS} from '@/sites'
import {getCurrentSite} from '@/lib/sites/current-site'

describe('site registry', () => {
  it('exposes the central site IDs and Site A RFQ mail target', () => {
    expect(SITE_IDS).toEqual(['tio2-a', 'tio2-b', 'tio2-my'])
    expect(getSiteConfig('tio2-a').rfqHref).toBe(
      'mailto:contact@tio2products.com',
    )
  })

  it.each(['tio2-a', 'tio2-b', 'tio2-my'])('loads %s', (id) => {
    expect(getSiteConfig(id).id).toBe(id)
  })

  it.each([
    ['tio2-a', 'https://tio2products.com', 'contact@tio2products.com'],
    ['tio2-b', 'https://tio2hub.com', 'contact@tio2hub.com'],
    ['tio2-my', 'https://tio2malaysia.com', null],
  ])('maps %s to its approved production origin', (id, url, contactEmail) => {
    const site = getSiteConfig(id)

    expect(site.url).toBe(url)
    expect(site.contactEmail).toBe(contactEmail)
  })

  it('keeps the Malaysia RFQ on the Malaysia origin without inventing contact details', () => {
    expect(getSiteConfig('tio2-my')).toMatchObject({
      id: 'tio2-my',
      locale: 'en',
      wordpressScope: 'tio2-my',
      rfqHref: 'https://tio2malaysia.com/request-a-quote/',
      contactEmail: null,
    })
  })

  it('rejects an unknown site', () => {
    expect(() => getSiteConfig('unknown')).toThrow('Unknown SITE_ID: unknown')
  })

  it('rejects a missing SITE_ID', () => {
    expect(() => getCurrentSite({})).toThrow('SITE_ID is required')
  })

  it('prevents nested SEO configuration mutation', () => {
    const site = getSiteConfig('tio2-a')

    expect(() => Object.assign(site.defaultSeo, {title: 'Changed'})).toThrow(TypeError)
    expect(getSiteConfig('tio2-a').defaultSeo.title).toBe('Titanium Dioxide Supplier & TiO2 Grades | TIOVAR')
  })

  it.each([
    ['javascript:', 'javascript:alert(1)', 'Invalid RFQ URL for tio2-a'],
    ['mismatched mailto address', 'mailto:other@tio2products.com', 'Invalid RFQ mail target for tio2-a'],
    ['HTTP URL', 'http://tio2products.com/rfq', 'Invalid RFQ URL for tio2-a'],
    ['URL credentials', 'https://user:pass@tio2products.com/rfq', 'Invalid RFQ URL for tio2-a'],
    ['foreign HTTPS origin', 'https://example.com/rfq', 'Invalid RFQ URL for tio2-a'],
  ])('rejects a %s RFQ target', (_label, rfqHref, error) => {
    expect(() => assertSiteRfqHref({...getSiteConfig('tio2-a'), rfqHref})).toThrow(error)
  })
})
