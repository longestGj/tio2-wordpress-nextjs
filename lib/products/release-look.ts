import 'server-only'

import {readFileSync} from 'node:fs'

import {
  validateSiteAApplicationManifest,
  type SiteAApplicationContentManifest,
} from '@/lib/applications/content-manifest'
import {
  validateProductContentManifest,
  type ProductContentManifest,
  type ProductContentRecord,
} from '@/lib/products/content-manifest'
import type {ProductLink, ProductPageDto} from '@/lib/products/types'
import {
  validateSiteAResourceManifest,
  type SiteAResourceContentManifest,
} from '@/lib/resources/content-manifest'
import {htmlToPlainText} from '@/lib/seo/text'

interface ReleaseLookEnvironment {
  readonly NODE_ENV?: string
  readonly SITE_A_RELEASE_LOOK_PREVIEW?: string
  readonly SITE_ID?: string
  readonly TASK12_APPLICATIONS_MANIFEST_PATH?: string
  readonly TASK12_PRODUCTS_MANIFEST_PATH?: string
  readonly TASK12_RESOURCES_MANIFEST_PATH?: string
}
interface ReleaseLookManifests {
  readonly applications: SiteAApplicationContentManifest
  readonly products: ProductContentManifest
  readonly resources: SiteAResourceContentManifest
}

function requiredPath(environment: ReleaseLookEnvironment, key: keyof ReleaseLookEnvironment): string {
  const value = environment[key]?.trim()
  if (!value) throw new Error(`Missing local release-look manifest variable: ${key}`)
  return value
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function loadManifests(environment: ReleaseLookEnvironment): ReleaseLookManifests {
  return {
    applications: validateSiteAApplicationManifest(readJson(requiredPath(
      environment,
      'TASK12_APPLICATIONS_MANIFEST_PATH',
    ))),
    products: validateProductContentManifest(readJson(requiredPath(
      environment,
      'TASK12_PRODUCTS_MANIFEST_PATH',
    ))),
    resources: validateSiteAResourceManifest(readJson(requiredPath(
      environment,
      'TASK12_RESOURCES_MANIFEST_PATH',
    ))),
  }
}

export function isSiteAReleaseLookEnabled(
  environment: ReleaseLookEnvironment,
): boolean {
  return environment.NODE_ENV === 'development' &&
    environment.SITE_A_RELEASE_LOOK_PREVIEW === '1' &&
    environment.SITE_ID === 'tio2-a'
}

function releaseLookProduct(
  record: ProductContentRecord,
  manifests: ReleaseLookManifests,
): ProductPageDto {
  const applications = new Map(
    manifests.applications.records.map((application) => [
      application.identity.id,
      application,
    ]),
  )
  const resources = new Map(
    manifests.resources.records.map((resource) => [
      resource.identity.id,
      resource,
    ]),
  )
  const products = new Map(
    manifests.products.products.map((product) => [product.productId, product]),
  )
  const application = (key: string) => {
    const target = applications.get(key)
    if (!target) throw new Error(`Missing release-look Application target: ${key}`)
    return target
  }
  const resource = (key: string) => {
    const target = resources.get(key)
    if (!target) throw new Error(`Missing release-look Resource target: ${key}`)
    return target
  }
  const product = (key: string) => {
    const target = products.get(key as ProductContentRecord['productId'])
    if (!target) throw new Error(`Missing release-look Product target: ${key}`)
    return target
  }
  const plainLink = (title: string): ProductLink => ({title})
  const family = application(record.family.targetKey)

  return {
    identity: {
      productId: record.productId,
      slug: record.slug,
      path: record.path,
      title: record.title,
      family: family.identity.title,
      modified: '',
    },
    seo: {title: record.metaTitle, description: record.metaDescription},
    hero: {
      eyebrow: record.eyebrow,
      problemHeadline: record.customerProblemHeadline,
      quickAnswer: record.quickAnswer,
    },
    snapshot: {
      productType: record.productType,
      process: record.process ?? '',
      primaryApplication: record.primaryApplication,
      positioning: record.positioning ?? '',
      surfaceTreatment: record.surfaceTreatment ?? '',
    },
    selection: {
      fitWhen: [...record.fitWhen],
      discussFirstWhen: [...record.discussFirstWhen],
    },
    performancePriorities: record.performancePriorities.map((priority) => ({
      ...priority,
    })),
    recommendedApplications: record.recommendedApplications.map(({targetKey}) => {
      const target = application(targetKey)
      return {
        title: target.identity.title,
        fit: htmlToPlainText(target.hero.directAnswer),
      }
    }),
    evidenceHtml: record.evidenceStatement,
    typicalProperties: record.typicalProperties.map((property) => ({...property})),
    validationChecklist: [...record.validationChecklist],
    enquiryFields: [],
    packaging: record.packaging,
    tdsAccess: record.tdsAccess,
    ctas: {
      requestTds: {label: '', description: ''},
      discussApplication: {label: '', description: ''},
    },
    faqs: record.faqItems.map(({answer, question}) => ({
      question,
      answerHtml: answer,
    })),
    relatedLinks: {
      applications: record.relatedLinks.applications.map(({targetKey}) =>
        plainLink(application(targetKey).identity.title)),
      resources: record.relatedLinks.resources.map(({targetKey}) =>
        plainLink(resource(targetKey).identity.title)),
      products: record.relatedLinks.products.map(({targetKey}) =>
        plainLink(product(targetKey).title)),
    },
    disclaimerHtml: '',
  }
}

export function loadSiteAReleaseLookProduct(
  slug: string,
  environment: ReleaseLookEnvironment,
): ProductPageDto | null {
  if (!isSiteAReleaseLookEnabled(environment)) return null
  const manifests = loadManifests(environment)
  const record = manifests.products.products.find((product) => product.slug === slug)
  return record ? releaseLookProduct(record, manifests) : null
}
