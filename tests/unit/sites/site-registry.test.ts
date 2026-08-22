import {describe, expect, it} from 'vitest'
import {getSiteConfig} from '@/sites'
import {getCurrentSite} from '@/lib/sites/current-site'

describe('site registry', () => {
  it.each(['tio2-a', 'tio2-b'])('loads %s', (id) => {
    expect(getSiteConfig(id).id).toBe(id)
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
    expect(getSiteConfig('tio2-a').defaultSeo.title).toBe('TiO2 A | Titanium Dioxide')
  })
})
