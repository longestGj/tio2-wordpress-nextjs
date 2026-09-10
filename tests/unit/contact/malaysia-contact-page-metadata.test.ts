import {describe, expect, it} from 'vitest'

import {buildMalaysiaContactPageMetadata} from '@/lib/seo/contact-page-metadata'
import {getSiteConfig} from '@/sites'
import {toMalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-dto'
import {malaysiaContactPageSource} from '@/tests/fixtures/tio2-my-contact-page'

describe('CONTACT-001 metadata', () => {
  it('emits the approved clean canonical and keeps private candidates out of search', () => {
    const metadata = buildMalaysiaContactPageMetadata(getSiteConfig('tio2-my'), toMalaysiaContactPageDto(malaysiaContactPageSource()), {})
    expect(metadata).toMatchObject({
      title: 'Contact TiO2 Malaysia | General Inquiries',
      description: 'Contact TiO2 Malaysia with a general company or business inquiry, or use the dedicated pages to request a quote, product documents or a sample.',
      alternates: {canonical: 'https://tio2malaysia.com/contact/'},
      robots: {index: false, follow: false},
      openGraph: {
        title: 'Contact TiO2 Malaysia',
        description: 'Contact TiO2 Malaysia with a general company or business inquiry, or use the dedicated pages to request a quote, product documents or a sample.',
        url: 'https://tio2malaysia.com/contact/',
      },
    })
  })

  it('enables the approved Contact index posture only in production', () => {
    const metadata = buildMalaysiaContactPageMetadata(
      getSiteConfig('tio2-my'),
      toMalaysiaContactPageDto(malaysiaContactPageSource()),
      {VERCEL_ENV: 'production'},
    )

    expect(metadata.robots).toEqual({index: true, follow: true})
  })
})
