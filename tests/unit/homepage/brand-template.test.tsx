// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {BrandHomepage} from '@/components/sites/tio2-a/homepage/brand-homepage'
import {toSiteABrandHomepageDto} from '@/lib/wordpress/homepage-v03-dto'
import {makeSiteABrandHomepageNode} from '@/tests/mocks/site-a-brand-homepage'

vi.mock('next/font/google', () => ({
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))

afterEach(cleanup)

describe('BrandHomepage', () => {
  it('renders the approved information sequence and safe Homepage actions', () => {
    const homepage = toSiteABrandHomepageDto(makeSiteABrandHomepageNode())
    const {container} = render(<BrandHomepage homepage={homepage} />)

    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Application-Specific Titanium Dioxide',
    })).toBeTruthy()

    expect(Array.from(
      container.querySelectorAll('section[aria-labelledby]'),
      (section) => section.getAttribute('aria-labelledby'),
    )).toEqual([
      'tiovar-hero-heading',
      'tiovar-about-heading',
      'tiovar-routes-heading',
      'tiovar-applications-heading',
      'tiovar-families-heading',
      'tiovar-selection-heading',
      'tiovar-resources-heading',
      'tiovar-process-heading',
      'tiovar-documents-heading',
      'tiovar-inquiry-heading',
      'tiovar-faq-heading',
    ])

    expect(container.querySelectorAll('a[href^="/products"]')).toHaveLength(0)
    expect(container.querySelectorAll('a[href^="/applications"]')).toHaveLength(0)
    expect(container.querySelectorAll('a[href^="/technical-resources"]')).toHaveLength(0)
    expect(container.querySelectorAll('a[download]')).toHaveLength(0)
    expect(screen.getByText(/Files are provided by request and matched to the relevant revision or batch context\./u)).toBeTruthy()
    expect(container.querySelectorAll('details')).toHaveLength(4)
    expect(container.querySelector('form')).toBeTruthy()
  })
})
