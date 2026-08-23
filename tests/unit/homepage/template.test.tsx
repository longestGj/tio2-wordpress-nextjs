import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, expectTypeOf, it, vi} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import type {HomepageDto} from '@/lib/wordpress/homepage-types'
import {makeHomepageNode} from '@/tests/mocks/handlers'

vi.mock('next/font/google', () => ({
  Inter: () => ({variable: 'inter-font'}),
  Source_Serif_4: () => ({variable: 'source-serif-font'}),
}))

function homepageFixture(): HomepageDto {
  return toHomepageDto(makeHomepageNode(), 'tio2-a')
}

describe('HomepageTemplate', () => {
  it('renders the approved semantic section order with one continuous heading hierarchy', async () => {
    const {HomepageTemplate} = await import(
      '@/components/homepage/homepage-template'
    )
    const homepage = homepageFixture()
    const markup = renderToStaticMarkup(
      <HomepageTemplate homepage={homepage} />,
    )

    expectTypeOf(HomepageTemplate).parameter(0).toEqualTypeOf<{
      readonly homepage: HomepageDto
    }>()

    const orderedText = [
      homepage.hero.heading,
      homepage.productDiscovery.heading,
      homepage.applicationDiscovery.heading,
      homepage.inquiry.heading,
      homepage.trust.heading,
      homepage.rfq.heading,
      homepage.faq.heading,
      homepage.closingCta.heading,
    ]
    let previousIndex = -1
    for (const text of orderedText) {
      const currentIndex = markup.indexOf(text)
      expect(currentIndex).toBeGreaterThan(previousIndex)
      previousIndex = currentIndex
    }

    const headingLevels = Array.from(markup.matchAll(/<h([1-6])(?:\s|>)/gu), (
      match,
    ) => Number(match[1]))
    expect(headingLevels.filter((level) => level === 1)).toHaveLength(1)
    expect(headingLevels[0]).toBe(1)
    expect(headingLevels.every((level) => level >= 1 && level <= 3)).toBe(true)
    expect(headingLevels.indexOf(3)).toBeGreaterThan(headingLevels.indexOf(2))
    expect(markup).not.toContain('<main')
  })

  it('omits the complete company metrics section when metrics are empty', async () => {
    const {HomepageTemplate} = await import(
      '@/components/homepage/homepage-template'
    )

    const markup = renderToStaticMarkup(
      <HomepageTemplate homepage={homepageFixture()} />,
    )

    expect(markup).not.toContain('aria-label="Company metrics"')
  })

  it('renders evidence-approved metrics between the hero and discovery content', async () => {
    const {HomepageTemplate} = await import(
      '@/components/homepage/homepage-template'
    )
    const base = homepageFixture()
    const homepage: HomepageDto = {
      ...base,
      metrics: [
        {
          value: '2',
          unit: 'routes',
          label: 'Validated supply routes',
          context: 'Owned and partner production are identified per offer.',
        },
      ],
    }

    const markup = renderToStaticMarkup(
      <HomepageTemplate homepage={homepage} />,
    )

    expect(markup).toContain('aria-label="Company metrics"')
    expect(markup.indexOf('Validated supply routes')).toBeGreaterThan(
      markup.indexOf(homepage.hero.heading),
    )
    expect(markup.indexOf('Validated supply routes')).toBeLessThan(
      markup.indexOf(homepage.productDiscovery.heading),
    )
  })

  it('keeps curated labels, native FAQ disclosure, and fixed RFQ anchors visible', async () => {
    const {HomepageTemplate} = await import(
      '@/components/homepage/homepage-template'
    )
    const homepage = homepageFixture()

    const markup = renderToStaticMarkup(
      <HomepageTemplate homepage={homepage} />,
    )

    expect(markup).toContain(
      `<a href="#rfq">${homepage.hero.primaryCta.label}</a>`,
    )
    expect(markup).toContain(
      `<a href="${homepage.hero.secondaryCta.href}">${homepage.hero.secondaryCta.label}</a>`,
    )
    expect(markup).toContain(
      `<a href="${homepage.productRoutes[0]?.href}">${homepage.productRoutes[0]?.title}</a>`,
    )
    expect(markup).toContain('<details>')
    expect(markup).toContain(
      `<summary>${homepage.faq.items[0]?.question}</summary>`,
    )
    expect(markup).toContain(
      `<a href="${homepage.faq.items[0]?.relatedLink?.href}">${homepage.faq.items[0]?.relatedLink?.label}</a>`,
    )
    expect(markup).toContain(
      `<a href="#rfq">${homepage.closingCta.label}</a>`,
    )
  })

  it('uses a text-first layout instead of a broken image when optional media is absent', async () => {
    const {HomepageTemplate} = await import(
      '@/components/homepage/homepage-template'
    )

    const markup = renderToStaticMarkup(
      <HomepageTemplate homepage={homepageFixture()} />,
    )

    expect(markup).not.toContain('<img')
  })
})
