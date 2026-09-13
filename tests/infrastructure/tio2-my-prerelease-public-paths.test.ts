import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

type EligibilityRoute = {
  pageId: string
  path: string
  canonical: string
  roles: string[]
}

type Eligibility = {
  candidateId: string
  siteScope: string
  locale: string
  routes: EligibilityRoute[]
  collections: Record<string, number>
}

type ApplicationHub = {
  applications: Array<{
    key: string
    grades: Array<{targetPageId: string; href: string}>
  }>
}

const d16Path = resolve('wordpress/plugins/tio2-site-model/config/tio2-my-prerelease-public-paths.json')
const gate6InventoryPath = resolve('lib/seo/tio2-my-publication-inventory.data.json')

const readEligibility = (path: string): Eligibility => JSON.parse(readFileSync(path, 'utf8')) as Eligibility
const tuples = (routes: EligibilityRoute[]) => routes.map(({pageId, path, canonical}) => ({pageId, path, canonical}))

describe('TiO2 Malaysia prerelease public-path eligibility', () => {
  it('copies the closed Gate 6 publication identity and exact route tuples', () => {
    const approved = JSON.parse(readFileSync(gate6InventoryPath, 'utf8')) as Array<{pageId: string; pathname: string | null; canonical: string | null}>
    const config = readEligibility(d16Path)

    expect(config.candidateId).toBe('TIO2-MY-FULL-PUBLIC-SEO-GA4-GATE6-2026-09-13')
    expect(config.siteScope).toBe('tio2-my')
    expect(config.locale).toBe('en')
    expect(tuples(config.routes)).toEqual(approved.filter((page) => page.pathname !== null).map((page) => ({
      pageId: page.pageId,
      path: page.pathname,
      canonical: page.canonical,
    })))
    expect(new Set(config.routes.map((route) => route.pageId)).size).toBe(config.routes.length)
    expect(new Set(config.routes.map((route) => route.path)).size).toBe(config.routes.length)
  })

  it('preserves the approved collection declarations and every route-backed target set', () => {
    const config = readEligibility(d16Path)
    const applicationHub = JSON.parse(
      readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json', 'utf8'),
    ) as ApplicationHub
    expect(config.collections).toEqual({
      homeActions: 6,
      productGrades: 14,
      productProcesses: 2,
      productSupport: 3,
      applicationChildren: 5,
      applicationGradeOccurrences: 30,
      applicationSupport: 3,
      resourceItems: 8,
      documentGuides: 3,
    })

    const countRole = (role: string) => config.routes.filter((route) => route.roles.includes(role)).length
    expect(countRole('home-action')).toBe(6)
    expect(countRole('product-grade')).toBe(14)
    expect(countRole('product-process')).toBe(2)
    expect(countRole('product-support')).toBe(3)
    expect(countRole('application-child')).toBe(5)
    expect(countRole('application-support')).toBe(3)
    expect(countRole('resource-item')).toBe(8)
    expect(countRole('document-guide')).toBe(3)

    const gradeOccurrences = applicationHub.applications.map((application) => ({
      application: application.key,
      count: application.grades.length,
    }))
    expect(gradeOccurrences).toEqual([
      {application: 'COAT', count: 8},
      {application: 'PLAS', count: 8},
      {application: 'MB', count: 7},
      {application: 'INK', count: 4},
      {application: 'PAPER', count: 2},
      {application: 'SPECIALTY', count: 1},
    ])
    const routeTuples = new Set(config.routes.map((route) => `${route.pageId}|${route.path}`))
    const mappedGradeTuples = applicationHub.applications.flatMap((application) =>
      application.grades.map((grade) => `${grade.targetPageId}|${grade.href}`),
    )
    expect(mappedGradeTuples).toHaveLength(30)
    expect(mappedGradeTuples.every((tuple) => routeTuples.has(tuple))).toBe(true)
  })

  it('keeps CONV-THANK as the single native route outside CMS mutation', () => {
    const config = readEligibility(d16Path)
    const nativeRoutes = config.routes.filter((route) => route.pageId === 'CONV-THANK')
    expect(nativeRoutes).toEqual([{
      pageId: 'CONV-THANK',
      path: '/thank-you/',
      canonical: 'https://tio2malaysia.com/thank-you/',
      roles: ['form-success-state'],
      schemaPolicy: 'INHERIT_CURRENT_APPROVED_VISIBLE_PARITY',
    }])
    expect(config.routes).toHaveLength(58)
  })

  it('ships a fail-closed local WP-CLI seed and an executable WordPress probe', () => {
    const seed = readFileSync('wordpress/seed/apply-tio2-my-prerelease-public-paths.php', 'utf8')
    const probe = readFileSync('wordpress/tests/prerelease-public-paths.php', 'utf8')
    expect(seed).toContain("defined('WP_CLI')")
    expect(seed).toContain("wp_get_environment_type() !== 'local'")
    expect(seed).toContain("getenv('D16_TIO2_MY_PRERELEASE_ROUTE_SEED') !== '1'")
    expect(seed).toContain('TIO2_MY_PRERELEASE_PUBLIC_PATHS_RESULT')
    expect(seed).not.toContain("'cmsRouteCount'")
    expect(seed).not.toContain("'nativeRouteCount'")
    expect(seed).toContain("'CONV-THANK'")
    expect(seed).toContain("tio2_find_homepage_ids('tio2-my', false)")
    expect(seed).toContain("tio2_homepage_internal_slug('tio2-my')")
    expect(seed).toContain('TIO2_MY_ROUTE_RELEASE_STATE_META')
    expect(probe).toContain("'routeCount' => 58")
    expect(probe).toContain("'cmsRouteCount' => 57")
    expect(probe).toContain("'nativeRouteCount' => 1")
  })
})
