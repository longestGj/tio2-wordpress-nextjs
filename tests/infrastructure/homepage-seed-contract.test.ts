import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

import {
  HOMEPAGE_RFQ_COPY_CONTRACTS,
  validateHomepageRfqCopy,
} from '@/lib/wordpress/homepage-rfq-copy'

const manifestPath = fileURLToPath(
  new URL('../../wordpress/seed/representative-content.json', import.meta.url),
)
const phpRfqContractPath = fileURLToPath(
  new URL(
    '../../wordpress/plugins/tio2-site-model/includes/homepage-rfq-copy.php',
    import.meta.url,
  ),
)
const rfqWhitespaceVectorsPath = fileURLToPath(
  new URL('../fixtures/homepage-rfq-whitespace-vectors.json', import.meta.url),
)

type Homepage = Record<string, unknown> & {
  homepage_schema_version: string
  hero_heading: string
  hero_summary: string
  hero_primary_label: string
  hero_secondary_label: string
  hero_secondary_path: string
  product_routes: Array<{product_path: string}>
  applications: Array<{application_path: string}>
  inquiry_steps: Array<{inquiry_step_title: string}>
  faqs: Array<{faq_question: string; faq_answer: string}>
  seo_title: string
  seo_description: string
  rfq_intro: string
  rfq_privacy_text: string
  rfq_success_heading: string
  rfq_success_message: string
  secondary_topics: Array<{secondary_topic: string}>
}

type Manifest = {
  sites: Array<{siteId: string; pages: Array<{publicPath: string}>; homepage?: Homepage}>
}

describe('homepage seed contract', () => {
  it('contains two independent complete homepage-v0.1 fixtures', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    const [siteA, siteB] = manifest.sites
    expect(siteA.homepage, 'missing tio2-a homepage fixture').toBeDefined()
    expect(siteB.homepage, 'missing tio2-b homepage fixture').toBeDefined()
    const homeA = siteA.homepage!
    const homeB = siteB.homepage!
    expect(homeA.homepage_schema_version).toBe('homepage-v0.1')
    expect(homeB.homepage_schema_version).toBe('homepage-v0.1')
    expect(homeA.hero_heading).toBe(
      'Titanium Dioxide Supply for Formulators and Distributors',
    )
    expect(homeB.hero_heading).toBe('Independent TiO2 Discovery for Site B Buyers')
    for (const key of [
      'hero_heading',
      'hero_summary',
      'seo_title',
      'seo_description',
      'rfq_success_message',
    ] as const) {
      expect(homeA[key]).not.toBe(homeB[key])
    }
    expect(homeA.hero_primary_label).toBe('Start an RFQ')
    expect(homeA.hero_secondary_label).toBe('Browse product options')
    expect(homeB.hero_primary_label).toBe('Open the local RFQ demo')
    expect(homeB.hero_secondary_label).toBe('Review Site B routes')
  })

  it('uses the approved existing route inventory and bounded repeaters', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    const expectedProducts = ['/products', '/test-content/long-tail-001']
    const expectedApplications = [
      '/applications',
      '/test-content/long-tail-002',
      '/test-content/long-tail-003',
      '/test-content/long-tail-004',
      '/test-content/long-tail-005',
    ]
    for (const site of manifest.sites) {
      const home = site.homepage!
      expect(home.product_routes.map(({product_path}) => product_path)).toEqual(
        expectedProducts,
      )
      expect(home.applications.map(({application_path}) => application_path)).toEqual(
        expectedApplications,
      )
      expect(home.inquiry_steps.map(({inquiry_step_title}) => inquiry_step_title)).toEqual(
        ['Share requirements', 'Review product fit', 'Confirm next steps'],
      )
      expect(home.faqs).toHaveLength(5)
      expect(new Set(home.secondary_topics.map(({secondary_topic}) => secondary_topic)).size)
        .toBe(home.secondary_topics.length)
      const routeInventory = new Set(site.pages.map(({publicPath}) => publicPath))
      for (const path of [
        home.hero_secondary_path,
        ...expectedProducts,
        ...expectedApplications,
      ]) {
        if (!path.startsWith('/test-content/')) expect(routeInventory.has(path)).toBe(true)
      }
    }
  })

  it('keeps claims synthetic, source-safe, and separates owned from partner production', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    for (const site of manifest.sites) {
      const serialized = JSON.stringify(site.homepage)
      expect(serialized).toMatch(/owned production/i)
      expect(serialized).toMatch(/OEM|partner production/i)
      expect(serialized).not.toMatch(/certif|capacity|ranking|performance/i)
      expect(serialized).not.toMatch(/https?:\/\/(?!example\.test)/i)
    }
  })

  it('keeps current Site A/B RFQ values byte-for-byte valid under their owning contracts', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    for (const site of manifest.sites) {
      const home = site.homepage!
      const contract = HOMEPAGE_RFQ_COPY_CONTRACTS[site.siteId as 'tio2-a' | 'tio2-b']
      expect(contract.fields['rfq.intro']).toContain(home.rfq_intro)
      expect(contract.fields['rfq.privacyText']).toContain(home.rfq_privacy_text)
      expect(contract.fields['rfq.success.heading']).toContain(home.rfq_success_heading)
      expect(contract.fields['rfq.success.message']).toContain(home.rfq_success_message)
    }
  })

  it('mechanically matches the PHP and TypeScript site-scoped RFQ contracts', () => {
    const source = readFileSync(phpRfqContractPath, 'utf8').replaceAll('\r\n', '\n')
    const serialized = /TIO2_HOMEPAGE_RFQ_COPY_JSON\s*=\s*<<<'JSON'\n([\s\S]*?)\nJSON;/u.exec(
      source,
    )
    expect(serialized, 'missing machine-readable PHP RFQ contract').not.toBeNull()
    expect(JSON.parse(serialized![1])).toEqual(HOMEPAGE_RFQ_COPY_CONTRACTS)
  })

  it('applies the shared Unicode whitespace vectors exactly in TypeScript', () => {
    const vectors = JSON.parse(readFileSync(rfqWhitespaceVectorsPath, 'utf8')) as Array<{
      label: string
      siteId: 'tio2-a' | 'tio2-b'
      fieldPath:
        | 'rfq.intro'
        | 'rfq.privacyText'
        | 'rfq.success.heading'
        | 'rfq.success.message'
      input: string
      expected: string
    }>

    for (const vector of vectors) {
      expect(
        validateHomepageRfqCopy(vector.siteId, vector.fieldPath, vector.input),
        vector.label,
      ).toBe(vector.expected)
    }
  })

})
