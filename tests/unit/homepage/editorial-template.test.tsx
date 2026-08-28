// @vitest-environment jsdom

import {createElement, type ImgHTMLAttributes} from 'react'
import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {HomepageRenderer} from '@/components/homepage/homepage-renderer'
import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {toSiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-dto'
import type {SiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-types'
import {getSiteConfig} from '@/sites'
import {
  makeHomepageNode,
  makeSiteAEditorialHomepageNode,
} from '@/tests/mocks/handlers'

vi.mock('next/font/google', () => ({
  Inter: () => ({variable: 'inter-font'}),
  Source_Serif_4: () => ({variable: 'source-serif-font'}),
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))

vi.mock('next/image', () => ({
  default: ({priority, ...props}: ImgHTMLAttributes<HTMLImageElement> & {
    readonly priority?: boolean
  }) => createElement('img', {
    ...props,
    'data-priority': priority ? 'true' : undefined,
  }),
}))

const siteA = getSiteConfig('tio2-a')
const siteB = getSiteConfig('tio2-b')

function siteAHomepage(): SiteAEditorialHomepageDto {
  return toSiteAEditorialHomepageDto(makeSiteAEditorialHomepageNode(), {
    rfqHref: siteA.rfqHref,
  })
}

afterEach(cleanup)

describe('HomepageRenderer', () => {
  it('renders the complete Site A editorial sequence without commerce routes or a form', () => {
    const homepage = siteAHomepage()
    const {container} = render(
      <HomepageRenderer site={siteA} homepage={homepage} />,
    )

    const sectionLabels = Array.from(
      container.querySelectorAll('section[aria-labelledby]'),
      (section) => section.getAttribute('aria-labelledby'),
    )

    expect(sectionLabels).toEqual([
      'site-a-hero-heading',
      'site-a-direct-answer-heading',
      'site-a-decision-framework-heading',
      'site-a-application-briefs-heading',
      'site-a-supply-routes-heading',
      'site-a-evidence-library-heading',
      'site-a-evaluation-method-heading',
      'site-a-faq-heading',
      'site-a-glossary-heading',
      'site-a-editorial-review-heading',
      'site-a-closing-heading',
    ])
    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelectorAll('main[data-site-id="tio2-a"]')).toHaveLength(1)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelectorAll('a[href*="/products"]')).toHaveLength(0)
    expect(container.querySelectorAll('a[href*="/applications"]')).toHaveLength(0)
    expect(screen.getAllByRole('link', {name: /rfq/i})).toHaveLength(2)
    expect(screen.getByText(homepage.editorial.reviewedAt).hidden).toBe(false)
    expect(screen.getByText(homepage.editorial.reviewedBy).hidden).toBe(false)
    expect(screen.getByText(homepage.editorial.reviewScope).hidden).toBe(false)
  })

  it('uses the validated Site A DTO for both RFQ anchors', () => {
    const base = siteAHomepage()
    const homepage: SiteAEditorialHomepageDto = {
      ...base,
      headerRfq: {label: 'Open buyer RFQ', href: 'https://tio2products.com/rfq'},
      closingCta: {
        ...base.closingCta,
        label: 'Complete buyer RFQ',
        href: 'https://tio2products.com/rfq',
      },
    }

    render(<HomepageRenderer site={siteA} homepage={homepage} />)

    expect(
      screen.getByRole('link', {name: 'Open buyer RFQ'}).getAttribute('href'),
    ).toBe(homepage.headerRfq.href)
    expect(
      screen.getByRole('link', {name: 'Complete buyer RFQ'}).getAttribute('href'),
    ).toBe(homepage.closingCta.href)
  })

  it('omits only optional Evidence and Glossary sections when their rows are empty', () => {
    const base = siteAHomepage()
    const homepage: SiteAEditorialHomepageDto = {
      ...base,
      evidenceItems: [],
      glossary: [],
    }
    const {container} = render(
      <HomepageRenderer site={siteA} homepage={homepage} />,
    )

    expect(container.querySelector('#site-a-evidence-library-heading')).toBeNull()
    expect(container.querySelector('#site-a-glossary-heading')).toBeNull()
    expect(container.querySelector('#site-a-editorial-review-heading')).not.toBeNull()
  })

  it('preserves the legacy Site B shell, Hero, and RFQ form', () => {
    const homepage = toHomepageDto(makeHomepageNode('tio2-b'), 'tio2-b', {
      linkPolicy: {siteId: 'tio2-b', isPublic: () => false},
    })
    const {container} = render(
      <HomepageRenderer site={siteB} homepage={homepage} />,
    )

    expect(container.querySelectorAll('main[data-site-id="tio2-b"]')).toHaveLength(1)
    expect(
      screen.getByRole('heading', {level: 1, name: homepage.hero.heading}).hidden,
    ).toBe(false)
    expect(container.querySelector('form')).not.toBeNull()
  })

  it('rejects a legacy DTO selected for the Site A editorial profile', () => {
    const homepage = toHomepageDto(makeHomepageNode('tio2-a'), 'tio2-a', {
      linkPolicy: {siteId: 'tio2-a', isPublic: () => false},
    })

    expect(() => render(
      <HomepageRenderer site={siteA} homepage={homepage} />,
    )).toThrow('Homepage template/data mismatch for tio2-a')
  })

  it('passes non-null Hero media through next/image dimensions and responsive sizes', () => {
    const base = siteAHomepage()
    const homepage: SiteAEditorialHomepageDto = {
      ...base,
      hero: {
        ...base.hero,
        image: {
          src: 'https://tio2products.com/uploads/editorial-hero.webp',
          alt: 'Buyer reviewing an editorial sourcing brief',
          width: 1440,
          height: 960,
          mimeType: 'image/webp',
        },
      },
    }

    render(<HomepageRenderer site={siteA} homepage={homepage} />)

    const image = screen.getByRole('img', {name: homepage.hero.image?.alt})
    expect(image.getAttribute('width')).toBe('1440')
    expect(image.getAttribute('height')).toBe('960')
    expect(image.getAttribute('sizes')).toBe(
      '(max-width: 780px) 100vw, (max-width: 1200px) 48vw, 42vw',
    )
    expect(image.getAttribute('data-priority')).toBe('true')
  })
})
