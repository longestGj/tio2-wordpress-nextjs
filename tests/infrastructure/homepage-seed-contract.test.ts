import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const manifestPath = fileURLToPath(
  new URL('../../wordpress/seed/representative-content.json', import.meta.url),
)
const applySeedPath = fileURLToPath(
  new URL('../../wordpress/seed/apply-seed.php', import.meta.url),
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
    const expectedProducts = ['/products', '/test-content/long-tail-1']
    const expectedApplications = [
      '/applications',
      '/test-content/long-tail-2',
      '/test-content/long-tail-3',
      '/test-content/long-tail-4',
      '/test-content/long-tail-5',
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

  it('records root identity before release and restores it on migration failure', () => {
    const source = readFileSync(applySeedPath, 'utf8')
    const recordStatus = source.indexOf("update_post_meta($root_page_id, '_tio2_previous_root_status'")
    const recordScope = source.indexOf("'_tio2_previous_root_site_scope'")
    const releaseScope = source.indexOf("wp_set_object_terms($root_page_id, [], 'site_scope'")

    expect(recordStatus).toBeGreaterThan(-1)
    expect(recordScope).toBeGreaterThan(recordStatus)
    expect(releaseScope).toBeGreaterThan(recordScope)
    expect(source).toContain("do_action('tio2_seed_homepage_after_root_release'")
    expect(source).toContain("wp_set_object_terms($rollback['root_page_id'], $rollback['site_scopes'], 'site_scope'")
    expect(source).toContain("'post_status' => $rollback['post_status']")
    expect(source).toContain("['ID' => $rollback['homepage_id'], 'post_status' => 'draft']")
  })
})
