import publicRoutesJson from '../wordpress/plugins/tio2-site-model/config/public-routes.json'
import {SITE_IDS} from './types'
import type {HomepageTemplateKey, PublicRouteDefinition, SiteId} from './types'

const homepageTemplateKeys = new Set<HomepageTemplateKey>([
  'site-a-homepage-editorial-v0.2',
  'site-b-homepage-v0.1-frozen',
])
const expectedHomepageTemplates: Readonly<Record<SiteId, HomepageTemplateKey>> = Object.freeze({
  'tio2-a': 'site-a-homepage-editorial-v0.2',
  'tio2-b': 'site-b-homepage-v0.1-frozen',
})

interface PublicRouteInventorySite {
  readonly expectedPublicUrls: number
  readonly routes: readonly PublicRouteDefinition[]
}

type PublicRouteInventory = Readonly<Record<SiteId, PublicRouteInventorySite>>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[], context: string): void {
  const actualKeys = Object.keys(value).sort()
  const sortedExpectedKeys = [...expectedKeys].sort()

  if (actualKeys.length !== sortedExpectedKeys.length || actualKeys.some((key, index) => key !== sortedExpectedKeys[index])) {
    throw new Error(`Invalid public route inventory ${context}`)
  }
}

function assertKnownSiteId(siteId: string): asserts siteId is SiteId {
  if (!SITE_IDS.includes(siteId as SiteId)) {
    throw new Error(`Unknown site ID: ${siteId}`)
  }
}

function parseRoute(siteId: SiteId, value: unknown): PublicRouteDefinition {
  if (!isRecord(value)) {
    throw new Error(`Invalid public route definition for ${siteId}`)
  }
  assertExactKeys(value, ['path', 'template'], `route for ${siteId}`)

  if (value.path !== '/') {
    throw new Error(`Invalid public route path for ${siteId}`)
  }
  if (typeof value.template !== 'string' || !homepageTemplateKeys.has(value.template as HomepageTemplateKey)) {
    throw new Error(`Invalid homepage template key for ${siteId}`)
  }

  return Object.freeze({
    path: '/',
    template: value.template as HomepageTemplateKey,
  })
}

export function parsePublicRouteInventory(value: unknown): PublicRouteInventory {
  if (!isRecord(value)) {
    throw new Error('Invalid public route inventory')
  }
  assertExactKeys(value, ['version', 'sites'], 'root')

  if (value.version !== 'root-only-v0.1' || !isRecord(value.sites)) {
    throw new Error('Invalid public route inventory')
  }
  assertExactKeys(value.sites, SITE_IDS, 'sites')

  const inventory = {} as Record<SiteId, PublicRouteInventorySite>
  for (const siteId of SITE_IDS) {
    const siteValue = value.sites[siteId]
    if (!isRecord(siteValue)) {
      throw new Error(`Invalid public route inventory site: ${siteId}`)
    }
    assertExactKeys(siteValue, ['expectedPublicUrls', 'routes'], `site: ${siteId}`)
    if (!Array.isArray(siteValue.routes)) {
      throw new Error(`Invalid public routes for ${siteId}`)
    }

    const rawPaths = siteValue.routes.map((route) => isRecord(route) ? route.path : undefined)
    if (rawPaths.some((path) => typeof path !== 'string')) {
      throw new Error(`Invalid public route definition for ${siteId}`)
    }
    if (new Set(rawPaths).size !== rawPaths.length) {
      const duplicatePath = rawPaths.find((path, index) => rawPaths.indexOf(path) !== index)
      throw new Error(`Duplicate public route for ${siteId}: ${duplicatePath}`)
    }
    if (siteValue.routes.length !== 1) {
      throw new Error(`Public route inventory must contain exactly one root route for ${siteId}`)
    }
    if (!Number.isInteger(siteValue.expectedPublicUrls) || siteValue.expectedPublicUrls !== siteValue.routes.length) {
      throw new Error(`Expected public URL count mismatch for ${siteId}`)
    }

    const routes = Object.freeze(siteValue.routes.map((route) => parseRoute(siteId, route)))
    if (routes[0].template !== expectedHomepageTemplates[siteId]) {
      throw new Error(`Homepage template does not belong to ${siteId}`)
    }

    inventory[siteId] = Object.freeze({
      expectedPublicUrls: siteValue.expectedPublicUrls,
      routes,
    })
  }

  return Object.freeze(inventory)
}

const publicRouteInventory = parsePublicRouteInventory(publicRoutesJson)

export function getPublicRoutes(siteId: SiteId): readonly PublicRouteDefinition[] {
  assertKnownSiteId(siteId)
  return publicRouteInventory[siteId].routes
}

export function isPublicRoute(siteId: SiteId, path: string): boolean {
  assertKnownSiteId(siteId)
  return getPublicRoutes(siteId).some((route) => route.path === path)
}

export function getExpectedPublicUrlCount(siteId: SiteId): number {
  assertKnownSiteId(siteId)
  return publicRouteInventory[siteId].expectedPublicUrls
}
