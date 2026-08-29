// @vitest-environment jsdom

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {ProductDetail} from '@/components/products/product-detail'
import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver, EditorialTarget} from '@/lib/editorial/types'
import {toProductDetailPageDto} from '@/lib/products/page-dto'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import type {ProductDetailPageDto, ProductPageResolver} from '@/lib/products/page-types'
import {tpC120ProductPageInput} from '@/tests/fixtures/products/product-pages'

vi.mock('next/font/google', () => ({
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))

const EXPECTED_SECTION_ORDER = [
  'breadcrumb',
  'hero',
  'decision-rail',
  'product-snapshot',
  'technical-data',
  'fit-check',
  'formulation-priorities',
  'validation-method',
  'application-context',
  'enquiry-preparation',
  'faq',
  'related-products-resources',
  'final-cta',
  'technical-disclaimer',
] as const

const EXPECTED_PROPERTIES = [
  ['TiO₂ content', '95', '%'],
  ['Rutile content', '99.9', '%'],
  ['Dry L*', '99.4', ''],
  ['Dry b*', '1.00', ''],
  ['Specific gravity', '4.1', 'g/cm3'],
  ['pH', '7.5', ''],
  ['Carbon black undertone (CBU)', '14.0', ''],
  ['Oil absorption', '17', 'g/100 g'],
  ['Mean particle size', '0.27', 'micrometres'],
] as const

const DETAIL_PRESENTATION: ProductDetailPageDto['presentation'] = {
  breadcrumb: {
    homeLabel: 'Home',
    productsLabel: 'Products',
    familyLabel: 'Coatings',
  },
  hero: {imageAlt: 'TP-C120 rutile titanium dioxide for water-based paint'},
  snapshot: {eyebrow: 'Product Snapshot', heading: 'What TP‑C120 is'},
  technicalData: {
    eyebrow: 'Technical Data',
    heading: 'TP‑C120 Technical Properties',
    intro: 'Review the TP‑C120 technical data when planning formulation trials.',
    caption: 'TP‑C120 technical properties',
    regionLabel: 'TP‑C120 technical properties table',
    headers: {property: 'Property', value: 'Value', unit: 'Unit'},
    noteLabel: 'Technical note:',
  },
  fitCheck: {
    eyebrow: 'Fit Check',
    heading: 'Where TP‑C120 fits',
    fitHeading: 'Consider TP‑C120 when',
    discussHeading: 'Conditions to discuss',
  },
  formulationPriorities: {
    eyebrow: 'Formulation Priorities',
    heading: 'What to check in your formulation',
  },
  validation: {
    eyebrow: 'Validation Method',
    heading: 'How to validate TP‑C120',
  },
  applicationContext: {
    cardDescription:
      'Review formulation-specific selection factors and relevant product starting points for water-based paint.',
    actionLabel: 'Explore Application Context',
  },
  enquiryPreparation: {
    eyebrow: 'Enquiry Preparation',
    heading: 'Prepare your TP‑C120 enquiry',
    intro:
      'Share the formulation and trial conditions that matter most so the TP‑C120 discussion starts with the right technical context.',
    itemsHeading: 'What to share',
    documentsHeading: 'Packaging and documents',
  },
  faq: {eyebrow: 'Common Questions', heading: 'Frequently Asked Questions'},
  related: {
    eyebrow: 'Related Products & Resources',
    heading: 'Continue your product comparison',
    productLabel: 'Product',
    resourceLabel: 'Resource',
    familyLabel: 'Family',
    productActionLabel: 'View Product',
    productDescriptions: [
      'General-purpose grade for solvent- and water-based architectural, industrial and decorative coatings.',
      'Multi-purpose grade for solvent- and water-based architectural, industrial and decorative coatings.',
      'High-PVC matte and flat architectural coatings with a dry-hiding focus.',
    ],
    resourceDescriptions: [
      'See how oil absorption relates to formulation and pigment response.',
      'Connect surface treatment with formulation response.',
    ],
    familyDescription: 'Return to the nine-grade family comparison.',
  },
  finalCta: {
    eyebrow: 'Next Step',
    heading: 'Prepare the next TP‑C120 trial step',
    description:
      'Request the technical document or share your binder, PVC and viscosity target to prepare the next formulation trial.',
  },
  disclaimerLabel: 'Technical Disclaimer',
  footerDescription:
    'Application-specific titanium dioxide products and technical support for industrial formulations.',
}

const productPaths = new Map<string, string>(
  SITE_A_PRODUCT_IDENTITIES.map(({id, path}) => [id, path]),
)
const titles = new Map<string, string>([
  ['coatings', 'All Coatings Products'],
  ['water-based-paint', 'Titanium Dioxide for Water-Based Paint'],
  ['article-04', 'Oil Absorption in TiO₂'],
  ['article-06', 'Surface Treatment'],
])

function pathFor(target: EditorialTarget): string | null {
  if (target.type === 'product') return productPaths.get(target.id) ?? null
  return resolveCanonicalEditorialTarget(target.type, target.id)?.path ?? null
}

function detailFixture(authorized: readonly string[] = []): ProductDetailPageDto {
  const editorial: EditorialLinkResolver = (target) => {
    const path = pathFor(target)
    if (!path) return null
    return {
      ...target,
      title: titles.get(target.id) ?? target.id,
      path,
      href: authorized.includes(path) ? path : null,
    }
  }
  const resolver: ProductPageResolver = {
    editorial,
    ctaHref: (kind) => `mailto:contact@tio2products.com?subject=${kind}`,
  }
  const input = structuredClone(tpC120ProductPageInput) as typeof tpC120ProductPageInput & {
    presentation?: typeof DETAIL_PRESENTATION
  }
  input.technicalNote =
    'These values support initial product comparison. Request the latest technical document for product specifications and test information.'
  input.disclaimerHtml =
    '<p>Product information is provided for technical evaluation and product-selection purposes. Technical data values are not guaranteed specifications unless explicitly stated in an agreed commercial specification or certificate of analysis. Performance may vary with formulation, processing conditions and use requirements.</p>'
  input.presentation = structuredClone(DETAIL_PRESENTATION)

  return toProductDetailPageDto(input, resolver)
}

function sectionOrder(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-product-section]'),
    (section) => section.dataset.productSection ?? '',
  )
}

afterEach(cleanup)

describe('ProductDetail TP-C120 v0.5', () => {
  it('renders the exact approved 14-section sequence with Technical Data immediately after Snapshot', () => {
    const page = detailFixture()
    const {container} = render(<ProductPageRenderer page={page} />)
    const order = sectionOrder(container)

    expect(order).toEqual(EXPECTED_SECTION_ORDER)
    expect(order.indexOf('technical-data')).toBe(
      order.indexOf('product-snapshot') + 1,
    )
    expect(order.indexOf('technical-data')).toBeLessThan(
      order.indexOf('fit-check'),
    )
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(
      screen.getByRole('heading', {level: 1, name: page.hero.headline}),
    ).not.toBeNull()
    for (const section of container.querySelectorAll('section[data-product-section]')) {
      const headingId = section.getAttribute('aria-labelledby')
      expect(headingId).toBeTruthy()
      expect(headingId ? section.querySelector(`#${headingId}`)?.matches('h1, h2') : false).toBe(
        true,
      )
    }
  })

  it('preserves exact nine-row Property, Value, Unit parity and one Technical Note', () => {
    const {container} = render(<ProductDetail page={detailFixture()} />)
    const table = screen.getByRole('table', {
      name: 'TP‑C120 technical properties',
    })
    const rows = within(table).getAllByRole('row').slice(1)

    expect(
      within(table).getAllByRole('columnheader').map(({textContent}) => textContent),
    ).toEqual(['Property', 'Value', 'Unit'])
    expect(
      rows.map((row) =>
        Array.from(row.querySelectorAll('th, td'), ({textContent}) => textContent ?? ''),
      ),
    ).toEqual(EXPECTED_PROPERTIES)
    expect(within(table).getAllByRole('rowheader')).toHaveLength(9)
    expect(container.querySelectorAll('[data-technical-note]')).toHaveLength(1)
    expect(
      screen.getByRole('region', {name: 'TP‑C120 technical properties table'}).tabIndex,
    ).toBe(0)
  })

  it('uses customer language, approved request-only document copy, and resolver-controlled CTA labels', () => {
    const page = detailFixture()
    const {container} = render(<ProductDetail page={page} />)
    const visible = container.textContent ?? ''

    for (const forbidden of [
      /\bcited\b/iu,
      /listed for/iu,
      /formulation evaluation/iu,
      /Reported Technical Data/iu,
      /Reported value/iu,
      /source TDS/iu,
      /\breproduce\b/iu,
      /The current TDS lists/iu,
      /The current TDS states/iu,
      /TDS does not state/iu,
    ]) {
      expect(visible).not.toMatch(forbidden)
    }
    expect(visible).toContain('Contact TIOVAR for current packaging information.')
    expect(visible).toContain('The TP‑C120 TDS is available on request.')

    const expectedHrefs = new Map([
      ['Request a TDS', 'mailto:contact@tio2products.com?subject=request-tds'],
      [
        'Discuss Your Application',
        'mailto:contact@tio2products.com?subject=discuss-application',
      ],
      ['Request a Sample', 'mailto:contact@tio2products.com?subject=request-sample'],
    ])
    for (const [label, href] of expectedHrefs) {
      const links = screen.getAllByRole('link', {name: label})
      expect(links.length).toBeGreaterThan(0)
      expect(links.every((link) => link.getAttribute('href') === href)).toBe(true)
    }
    expect(container.querySelector('a[download]')).toBeNull()
    expect(container.querySelector('a[href$=".pdf" i]')).toBeNull()
    expect(container.querySelector('a[href*="/tds" i]')).toBeNull()
  })

  it('renders every approved decision, validation, enquiry, FAQ, related, CTA, and disclaimer element', () => {
    const page = detailFixture([
      '/products/coatings/tp-c100',
      '/products/coatings/tp-c110',
      '/products/coatings/tp-c200',
      '/products/coatings',
    ])
    const {container} = render(<ProductDetail page={page} />)

    expect(container.querySelectorAll('[data-formulation-priority]')).toHaveLength(5)
    expect(container.querySelectorAll('[data-validation-step]')).toHaveLength(6)
    expect(container.querySelectorAll('[data-enquiry-item]')).toHaveLength(6)
    expect(container.querySelectorAll('[data-product-faq-item]')).toHaveLength(6)
    expect(
      container.querySelector('[data-product-section="application-context"]')
        ?.textContent,
    ).toContain('Application Context')
    expect(
      container.querySelector('[data-product-section="enquiry-preparation"]')
        ?.textContent,
    ).toContain('Enquiry Preparation')
    for (const title of [
      'TP-C100',
      'TP-C110',
      'TP-C200',
      'Oil Absorption in TiO₂',
      'Surface Treatment',
      'All Coatings Products',
    ]) {
      expect(container.textContent).toContain(title)
    }
    expect(container.querySelector('[data-product-section="final-cta"]')).not.toBeNull()
    expect(
      container.querySelector('[data-product-section="technical-disclaimer"]'),
    ).not.toBeNull()
  })

  it('renders template labels, headings, alt text, and section copy from the Detail DTO', () => {
    const page = detailFixture()
    page.presentation = {
      ...structuredClone(DETAIL_PRESENTATION),
      breadcrumb: {
        homeLabel: 'Fixture home',
        productsLabel: 'Fixture products',
        familyLabel: 'Fixture family',
      },
      hero: {imageAlt: 'Fixture hero image'},
      snapshot: {eyebrow: 'Fixture snapshot eyebrow', heading: 'Fixture snapshot heading'},
      technicalData: {
        ...DETAIL_PRESENTATION.technicalData,
        heading: 'Fixture technical heading',
        intro: 'Fixture technical intro.',
        caption: 'Fixture table caption',
        regionLabel: 'Fixture table region',
        noteLabel: 'Fixture note label:',
      },
      finalCta: {
        eyebrow: 'Fixture next step',
        heading: 'Fixture final heading',
        description: 'Fixture final description.',
      },
      disclaimerLabel: 'Fixture disclaimer label',
      footerDescription: 'Fixture footer description.',
    }

    const {container} = render(<ProductDetail page={page} />)
    for (const copy of [
      'Fixture home',
      'Fixture products',
      'Fixture family',
      'Fixture snapshot eyebrow',
      'Fixture snapshot heading',
      'Fixture technical heading',
      'Fixture technical intro.',
      'Fixture note label:',
      'Fixture final heading',
      'Fixture final description.',
      'Fixture disclaimer label',
      'Fixture footer description.',
    ]) {
      expect(container.textContent).toContain(copy)
    }
    expect(container.querySelector('[data-product-section="hero"] img')?.getAttribute('alt')).toBe(
      'Fixture hero image',
    )
    expect(screen.getByRole('table', {name: 'Fixture table caption'})).not.toBeNull()
    expect(screen.getByRole('region', {name: 'Fixture table region'})).not.toBeNull()
  })

  it('uses the approved Next Image asset and full-page v0.5 focus, rhythm, and responsive CSS', () => {
    const {container} = render(<ProductDetail page={detailFixture()} />)
    const experience = container.querySelector('[data-product-experience]')
    expect(experience?.contains(container.querySelector('header'))).toBe(true)
    expect(experience?.contains(container.querySelector('main'))).toBe(true)
    expect(experience?.contains(container.querySelector('footer'))).toBe(true)
    const image = container.querySelector<HTMLImageElement>(
      '[data-product-section="hero"] img',
    )
    expect(image?.getAttribute('src')).toContain('tp-c120-hero.png')
    expect(image?.getAttribute('width')).toBe('1536')
    expect(image?.getAttribute('height')).toBe('1024')
    expect(image?.getAttribute('sizes')).toBe('(max-width: 700px) 100vw, 62vw')
    expect(image?.getAttribute('fetchpriority')).toBe('high')

    const stylesheet = readFileSync(
      resolve(process.cwd(), 'components/products/product-detail.module.css'),
      'utf8',
    )
    expect(stylesheet).toContain('--detail-navy: #0a1f44')
    expect(stylesheet).toContain('--detail-ice: #f5f7f9')
    expect(stylesheet).toContain('width: min(100%, 1180px)')
    expect(stylesheet).toContain('outline: 3px solid')
    expect(stylesheet).toContain('@media (max-width: 700px)')
    expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)')
    expect(stylesheet).not.toMatch(/#0f3d32|#143f35|--product-green/iu)
  })
})
