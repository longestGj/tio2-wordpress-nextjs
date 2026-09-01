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
})
