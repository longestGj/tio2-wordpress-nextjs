import {describe, expect, it} from 'vitest'

import {buildMalaysiaAboutPageMetadata} from '@/lib/seo/about-page-metadata'
import {toMalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaAboutPageSource} from '@/tests/fixtures/tio2-my-about-page'

describe('ABOUT-001 metadata', () => {
  it('emits one normalized canonical, no hreflang/images and environment-safe robots', () => {
    const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource())
    const metadata = buildMalaysiaAboutPageMetadata(getSiteConfig('tio2-my'), dto, {})
    expect(metadata.title).toBe(dto.seo.title)
    expect(metadata.alternates).toEqual({canonical: 'https://tio2malaysia.com/about/'})
    expect(metadata.robots).toEqual({index: false, follow: false})
    expect(metadata.openGraph).toMatchObject({type: 'website', url: dto.seo.canonical, title: dto.seo.openGraphTitle, images: []})
    expect(metadata.alternates).not.toHaveProperty('languages')
  })

  it('omits restricted description fields instead of emitting null or fallback copy', () => {
    const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource({evidenceState: 'restricted'}))
    const metadata = buildMalaysiaAboutPageMetadata(getSiteConfig('tio2-my'), dto, {})
    expect(metadata.description).toBeNull()
    expect(metadata.openGraph).not.toHaveProperty('description')
    expect(metadata.alternates).toEqual({canonical: 'https://tio2malaysia.com/about/'})
    expect(metadata.robots).toEqual({index: false, follow: false})
  })

  it('uses only the neutral approved identity for arbitrary restricted combinations', () => {
    const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource({
      evidenceState: 'restricted',
      authorizations: {'location.full': 'restricted', 'export.port': 'not_public'},
    }))
    const metadata = buildMalaysiaAboutPageMetadata(getSiteConfig('tio2-my'), dto, {})
    expect(metadata.title).toBe('About TiO2 Malaysia')
    expect(metadata.openGraph).toMatchObject({title: 'About TiO2 Malaysia'})
    expect(metadata.description).toBeNull()
    expect(JSON.stringify(metadata)).not.toMatch(/manufacturer|Port Klang|Taiping/iu)
  })
})
