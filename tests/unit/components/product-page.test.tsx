// @vitest-environment jsdom

import {readFileSync, readdirSync} from 'node:fs'
import {resolve} from 'node:path'

import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {
  PRODUCT_EXTENSION_INSERTION_POINTS,
  ProductExtensionSlot,
  productExtensionRegistry,
} from '@/components/products/extension-registry'
import {ProductPage} from '@/components/products/product-page'
import {toProductPageDto} from '@/lib/products/dto'
import type {ProductPageDto} from '@/lib/products/types'
import {getSiteConfig} from '@/sites'
import {validProductPageInput} from '@/tests/fixtures/product-page'

const EXPECTED_SECTION_ORDER = [
  'hero',
  'snapshot',
  'selection-check',
  'performance-priorities',
  'recommended-applications',
  'product-evidence',
  'typical-properties',
  'validation-guide',
  'enquiry-details',
  'packaging-documents',
  'frequently-asked-questions',
  'related-applications-and-resources',
  'final-cta',
  'technical-disclaimer',
] as const

const RELEASE_LOOK_SECTION_ORDER = [
  'hero',
  'snapshot',
  'selection-check',
  'performance-priorities',
  'recommended-applications',
  'product-evidence',
  'typical-properties',
  'validation-guide',
  'packaging-documents',
  'frequently-asked-questions',
  'related-applications-and-resources',
] as const

function completeProduct(): ProductPageDto {
  return toProductPageDto(validProductPageInput)
}

function cssColor(stylesheet: string, property: string): string {
  const value = stylesheet.match(
    new RegExp(`${property}:\\s*(#[0-9a-f]{6})`, 'iu'),
  )?.[1]
  if (!value) throw new Error(`Missing CSS color property: ${property}`)
  return value
}

function cssRule(stylesheet: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const rule = stylesheet.match(
    new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'iu'),
  )?.[1]
  if (!rule) throw new Error(`Missing CSS rule: ${selector}`)
  return rule
}

function cssDeclaration(rule: string, property: string): string {
  const value = rule.match(new RegExp(`${property}:\\s*([^;]+);`, 'iu'))?.[1]
  if (!value) throw new Error(`Missing CSS declaration: ${property}`)
  return value.trim()
}

function resolveCssColor(stylesheet: string, value: string): string {
  const customProperty = value.match(/^var\((--[a-z0-9-]+)\)$/iu)?.[1]
  if (customProperty) return cssColor(stylesheet, customProperty)
  if (/^#[0-9a-f]{6}$/iu.test(value)) return value
  throw new Error(`Unsupported CSS color: ${value}`)
}

function compositeRgbSurface(value: string, backdrop: string): string {
  const match = value.match(
    /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*(\d+)%\s*\)$/iu,
  )
  const backdropChannels = backdrop
    .slice(1)
    .match(/.{2}/gu)
    ?.map((channel) => Number.parseInt(channel, 16))
  if (!match || !backdropChannels || backdropChannels.length !== 3) {
    throw new Error(`Unsupported composited CSS surface: ${value}`)
  }

  const opacity = Number.parseInt(match[4]!, 10) / 100
  const foregroundChannels = match
    .slice(1, 4)
    .map((channel) => Number.parseInt(channel!, 10))
  const channels = foregroundChannels.map((channel, index) =>
    Math.round(channel * opacity + backdropChannels[index]! * (1 - opacity)),
  )

  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`
}

function relativeLuminance(hex: string): number {
  const parts = hex.slice(1).match(/.{2}/gu)
  if (!parts || parts.length !== 3) throw new Error(`Invalid color: ${hex}`)
  const [red, green, blue] = parts.map((part) => {
    const channel = Number.parseInt(part, 16) / 255
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

afterEach(cleanup)

describe('ProductPage', () => {
  it('renders one H1 and the exact approved 14-section decision flow', () => {
    const product = completeProduct()
    const {container} = render(<ProductPage product={product} />)
    const sections = Array.from(
      container.querySelectorAll<HTMLElement>('section[data-product-section]'),
    )

    expect(sections.map((section) => section.dataset.productSection)).toEqual(
      EXPECTED_SECTION_ORDER,
    )
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(
      screen.getByRole('heading', {level: 1, name: product.identity.title}),
    ).not.toBeNull()

    for (const section of sections) {
      const labelledBy = section.getAttribute('aria-labelledby')
      const heading = labelledBy ? document.getElementById(labelledBy) : null

      expect(labelledBy).toBeTruthy()
      expect(heading?.matches('h1, h2')).toBe(true)
      expect(heading ? section.contains(heading) : false).toBe(true)
    }
  })

  it('keeps the 40-70-word Quick Answer visible in the hero', () => {
    const {container} = render(<ProductPage product={completeProduct()} />)
    const hero = container.querySelector<HTMLElement>(
      'section[data-product-section="hero"]',
    )
    const quickAnswer = hero?.querySelector<HTMLElement>(
      '[data-product-quick-answer]',
    )
    const wordCount = quickAnswer?.textContent?.trim().split(/\s+/u).length ?? 0

    expect(
      within(hero as HTMLElement).getByRole('heading', {
        level: 2,
        name: 'Quick Answer',
      }),
    ).not.toBeNull()
    expect(quickAnswer?.hidden).toBe(false)
    expect(wordCount).toBeGreaterThanOrEqual(40)
    expect(wordCount).toBeLessThanOrEqual(70)
  })

  it('uses an accessible properties table and keeps all FAQs visible', () => {
    const product = completeProduct()
    const {container} = render(<ProductPage product={product} />)
    const table = screen.getByRole('table', {
      name: `Typical properties for ${product.identity.productId}`,
    })
    const tableRegion = table.closest<HTMLElement>('[role="region"]')

    expect(
      within(table).getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['Property', 'Typical value', 'Unit', 'Method', 'Note'])
    expect(within(table).getAllByRole('rowheader')).toHaveLength(
      product.typicalProperties.length,
    )
    expect(
      Array.from(table.querySelectorAll('thead th')).every(
        (header) => header.getAttribute('scope') === 'col',
      ),
    ).toBe(true)
    expect(
      Array.from(table.querySelectorAll('tbody th')).every(
        (header) => header.getAttribute('scope') === 'row',
      ),
    ).toBe(true)
    expect(tableRegion?.getAttribute('tabindex')).toBe('0')
    expect(tableRegion?.getAttribute('aria-labelledby')).toBe(
      'product-typical-properties-heading',
    )

    const faqItems = Array.from(
      container.querySelectorAll<HTMLElement>('[data-product-faq-item]'),
    )
    expect(faqItems).toHaveLength(product.faqs.length)
    expect(faqItems.length).toBeGreaterThanOrEqual(6)
    expect(faqItems.length).toBeLessThanOrEqual(10)

    product.faqs.forEach((faq) => {
      const question = screen.getByRole('heading', {
        level: 3,
        name: faq.question,
      })
      expect(question.hidden).toBe(false)
      expect(
        question.closest<HTMLElement>('[data-product-faq-item]')?.hidden,
      ).toBe(false)
    })
  })

  it('places code-controlled Site A CTAs in the hero, after properties, and near the end', () => {
    const product = completeProduct()
    const siteA = getSiteConfig('tio2-a')
    const {container} = render(<ProductPage product={product} />)
    const ctaGroups = Array.from(
      container.querySelectorAll<HTMLElement>('[data-product-cta-placement]'),
    )

    expect(ctaGroups.map((group) => group.dataset.productCtaPlacement)).toEqual([
      'hero',
      'after-properties',
      'final',
    ])

    for (const group of ctaGroups) {
      const links = within(group).getAllByRole('link')
      expect(links.map((link) => link.textContent)).toEqual([
        product.ctas.requestTds.label,
        product.ctas.discussApplication.label,
      ])
      expect(
        links.every((link) => link.getAttribute('href') === siteA.rfqHref),
      ).toBe(true)
    }

    const propertiesSection = container.querySelector(
      'section[data-product-section="typical-properties"]',
    )
    expect(
      propertiesSection?.querySelector(
        '[data-product-cta-placement="after-properties"]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector(
        'section[data-product-section="final-cta"][data-product-cta-placement="final"]',
      ),
    ).not.toBeNull()
  })

  it('hides unapproved shared conversion content in local release-look mode', () => {
    const product = completeProduct()
    const {container} = render(
      <ProductPage displayMode="release-look" product={product} />,
    )
    const sections = Array.from(
      container.querySelectorAll<HTMLElement>('section[data-product-section]'),
    )

    expect(sections.map((section) => section.dataset.productSection)).toEqual(
      RELEASE_LOOK_SECTION_ORDER,
    )
    expect(container.querySelectorAll('[data-product-cta-placement]')).toHaveLength(0)
    expect(
      container.querySelector('[data-product-section="enquiry-details"]'),
    ).toBeNull()
    expect(
      container.querySelector('[data-product-section="technical-disclaimer"]'),
    ).toBeNull()
    expect(screen.queryByText(product.ctas.requestTds.description)).toBeNull()
    expect(screen.queryByText(product.ctas.discussApplication.description)).toBeNull()
  })

  it('keeps forbidden journey labels and direct TDS downloads out of the template', () => {
    const {container} = render(<ProductPage product={completeProduct()} />)
    const packaging = container.querySelector<HTMLElement>(
      'section[data-product-section="packaging-documents"]',
    )

    expect(screen.queryByText(/Buyer Path/iu)).toBeNull()
    expect(screen.queryByText(/Your Goal/iu)).toBeNull()
    expect(packaging?.textContent).toMatch(/available by request/iu)
    expect(container.querySelector('a[download]')).toBeNull()
    expect(container.querySelector('a[href$=".pdf" i]')).toBeNull()
    expect(container.querySelector('a[href*="/tds" i]')).toBeNull()
  })

  it('omits empty related groups and removes the whole section when none remain', () => {
    const base = completeProduct()
    const partialProduct: ProductPageDto = {
      ...base,
      relatedLinks: {
        applications: base.relatedLinks.applications,
        resources: [],
        products: [],
      },
    }
    const {container, rerender} = render(
      <ProductPage product={partialProduct} />,
    )

    expect(
      screen.getByRole('heading', {level: 3, name: 'Related Applications'}),
    ).not.toBeNull()
    expect(
      screen.queryByRole('heading', {level: 3, name: 'Technical Resources'}),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', {level: 3, name: 'Related Products'}),
    ).toBeNull()

    rerender(
      <ProductPage
        product={{
          ...base,
          relatedLinks: {applications: [], resources: [], products: []},
        }}
      />,
    )

    expect(
      container.querySelector(
        'section[data-product-section="related-applications-and-resources"]',
      ),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: 'Related Applications and Resources',
      }),
    ).toBeNull()
  })

  it('defines every CSS Module class referenced by a Product component', () => {
    const componentDirectory = resolve(process.cwd(), 'components/products')
    const componentSource = readdirSync(componentDirectory)
      .filter((fileName) => fileName.endsWith('.tsx'))
      .map((fileName) => readFileSync(resolve(componentDirectory, fileName), 'utf8'))
      .filter((source) => source.includes("'./product-page.module.css'"))
      .join('\n')
    const stylesheet = readFileSync(
      resolve(componentDirectory, 'product-page.module.css'),
      'utf8',
    )
    const referencedClasses = new Set(
      Array.from(
        componentSource.matchAll(/styles\.([A-Za-z][A-Za-z0-9_]*)/gu),
        (match) => match[1],
      ),
    )
    const definedClasses = new Set(
      Array.from(
        stylesheet.matchAll(/^\.([A-Za-z][A-Za-z0-9_]*)/gmu),
        (match) => match[1],
      ),
    )

    expect(
      Array.from(referencedClasses).filter(
        (className) => !definedClasses.has(className),
      ),
    ).toEqual([])
  })

  it('uses focus indicators with 3:1 contrast on light and dark surfaces', () => {
    const stylesheet = readFileSync(
      resolve(
        process.cwd(),
        'components/products/product-page.module.css',
      ),
      'utf8',
    )

    expect(
      contrastRatio(
        cssColor(stylesheet, '--product-focus'),
        cssColor(stylesheet, '--product-paper'),
      ),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrastRatio(
        cssColor(stylesheet, '--product-focus-on-dark'),
        cssColor(stylesheet, '--product-green-deep'),
      ),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrastRatio(
        cssColor(stylesheet, '--product-focus-on-dark'),
        resolveCssColor(
          stylesheet,
          cssDeclaration(cssRule(stylesheet, '.finalCta'), 'background'),
        ),
      ),
    ).toBeGreaterThanOrEqual(3)
    expect(stylesheet).toContain('.propertiesSection a:focus-visible')
    expect(stylesheet).toContain('.finalCta a:focus-visible')
    expect(stylesheet).toContain(
      'outline-color: var(--product-focus-on-dark);',
    )
  })

  it('keeps normal Final CTA copy at 4.5:1 on solid and translucent surfaces', () => {
    const stylesheet = readFileSync(
      resolve(
        process.cwd(),
        'components/products/product-page.module.css',
      ),
      'utf8',
    )
    const finalSurface = resolveCssColor(
      stylesheet,
      cssDeclaration(cssRule(stylesheet, '.finalCta'), 'background'),
    )
    const bodyColor = resolveCssColor(
      stylesheet,
      cssDeclaration(
        cssRule(stylesheet, '.finalCtaCopy > p:last-child'),
        'color',
      ),
    )
    const cardSurface = compositeRgbSurface(
      cssDeclaration(cssRule(stylesheet, '.finalCta .ctaAction'), 'background'),
      finalSurface,
    )
    const descriptionColor = resolveCssColor(
      stylesheet,
      cssDeclaration(cssRule(stylesheet, '.finalCta .ctaAction p'), 'color'),
    )

    expect
      .soft(contrastRatio(bodyColor, finalSurface))
      .toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(descriptionColor, cardSurface)).toBeGreaterThanOrEqual(
      4.5,
    )
  })

  it('ships only typed, empty extension insertion points in v0.1', () => {
    const product = completeProduct()
    const {container} = render(
      <ProductExtensionSlot insertionPoint="after-snapshot" product={product} />,
    )

    expect(PRODUCT_EXTENSION_INSERTION_POINTS).toEqual([
      'after-snapshot',
      'after-product-evidence',
      'after-validation-guide',
    ])
    expect(productExtensionRegistry).toHaveLength(0)
    expect(container.childElementCount).toBe(0)
  })
})
