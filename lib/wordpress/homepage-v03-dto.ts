import {normalizePlainText} from '@/lib/seo/text'

import {HomepageContractError, HomepageVersionError} from './homepage-dto'
import type {HomepageImageDto} from './homepage-types'
import type {SiteABrandHomepageDto} from './homepage-v03-types'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'

type UnknownRecord = Record<string, unknown>

export interface SiteABrandHomepageSource {
  id: unknown
  modifiedGmt: unknown
  status: unknown
  siteScopes: unknown
  homepageFields: UnknownRecord
  brandHomepageFields: UnknownRecord
}

function record(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HomepageContractError(path)
  }
  return value as UnknownRecord
}

function text(value: unknown, path: string, max = 800): string {
  if (typeof value !== 'string') throw new HomepageContractError(path)
  const normalized = normalizePlainText(value.trim(), Number.MAX_SAFE_INTEGER)
  if (!normalized || Array.from(normalized).length > max || /<\/?[a-z][^>]*>/iu.test(normalized)) {
    throw new HomepageContractError(path)
  }
  return normalized
}

function exactRows(value: unknown, path: string, count: number): UnknownRecord[] {
  if (!Array.isArray(value) || value.length !== count) {
    throw new HomepageContractError(path)
  }
  return value.map((row, index) => record(row, `${path}[${index}]`))
}

function textItems(value: unknown, path: string, count: number) {
  return exactRows(value, path, count).map((row, index) => ({
    title: text(row.itemTitle, `${path}[${index}].title`, 120),
    description: text(row.itemDescription, `${path}[${index}].description`),
  }))
}

function image(value: unknown, alt: unknown): HomepageImageDto | null {
  if (value === null || value === undefined) return null
  const node = record(record(value, 'hero.image').node, 'hero.image.node')
  const details = record(node.mediaDetails, 'hero.image.mediaDetails')
  const mimeType = text(node.mimeType, 'hero.image.mimeType', 32)
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(mimeType)) {
    throw new HomepageContractError('hero.image.mimeType')
  }
  const width = Number(details.width)
  const height = Number(details.height)
  if (!Number.isSafeInteger(width) || width <= 0) throw new HomepageContractError('hero.image.width')
  if (!Number.isSafeInteger(height) || height <= 0) throw new HomepageContractError('hero.image.height')
  return {
    src: text(node.mediaItemUrl, 'hero.image.src', 2048),
    alt: text(alt, 'hero.image.alt', 160),
    width,
    height,
    mimeType: mimeType as HomepageImageDto['mimeType'],
  }
}

export function toSiteABrandHomepageDto(
  sourceValue: SiteABrandHomepageSource,
  options: {readonly readMode?: 'published' | 'preview'} = {},
): SiteABrandHomepageDto {
  const source = record(sourceValue, 'homepage')
  const homepage = record(source.homepageFields, 'homepageFields')
  const schemaVersion = typeof homepage.homepageSchemaVersion === 'string'
    ? homepage.homepageSchemaVersion.trim()
    : ''
  if (schemaVersion !== 'homepage-v0.3-brand') {
    throw new HomepageVersionError(schemaVersion)
  }
  const brand = record(source.brandHomepageFields, 'brandHomepageFields')

  const scopes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(scopes)) throw new HomepageContractError('identity.siteScopes')
  const siteIds = scopes.map((scope, index) => text(record(scope, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`, 32))
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-a') {
    throw new CrossSiteContentError('tio2-a', siteIds)
  }
  const status = text(source.status, 'identity.status', 20)
  const expectedStatus = options.readMode === 'preview' ? 'draft' : 'publish'
  if (status !== expectedStatus) throw new HomepageContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new HomepageContractError('identity.modified')

  const capabilities = exactRows(brand.capabilities, 'about.capabilities', 4).map((row, index) =>
    text(row.capability, `about.capabilities[${index}]`, 100),
  )
  const metrics = exactRows(brand.brandMetrics, 'about.metrics', 3).map((row, index) => ({
    value: text(row.metricValue, `about.metrics[${index}].value`, 20),
    label: text(row.metricLabel, `about.metrics[${index}].label`, 100),
  }))
  const routes = exactRows(brand.buyerRoutes, 'routes.items', 3).map((row, index) => ({
    title: text(row.routeTitle, `routes.items[${index}].title`, 120),
    description: text(row.routeDescription, `routes.items[${index}].description`),
    ctaLabel: text(row.routeCtaLabel, `routes.items[${index}].ctaLabel`, 80),
  }))
  const resources = exactRows(brand.technicalResources, 'resources.items', 4).map((row, index) => ({
    tag: text(row.resourceTag, `resources.items[${index}].tag`, 50),
    title: text(row.resourceTitle, `resources.items[${index}].title`, 120),
    description: text(row.resourceDescription, `resources.items[${index}].description`),
  }))
  const documents = exactRows(brand.controlledDocuments, 'documents.items', 4).map((row, index) => {
    const rawAccess = Array.isArray(row.documentAccess) && row.documentAccess.length === 1
      ? row.documentAccess[0]
      : row.documentAccess
    const access = text(rawAccess, `documents.items[${index}].access`, 20)
    if (access !== 'Request') throw new HomepageContractError(`documents.items[${index}].access`)
    return {
      title: text(row.documentTitle, `documents.items[${index}].title`, 120),
      context: text(row.documentContext, `documents.items[${index}].context`, 160),
      access,
    } as const
  })
  const faqItems = exactRows(brand.brandFaqs, 'faq.items', 4).map((row, index) => ({
    question: text(row.faqQuestion, `faq.items[${index}].question`, 180),
    answer: text(row.faqAnswer, `faq.items[${index}].answer`),
  }))
  const secondaryTopics = Array.isArray(homepage.secondaryTopics)
    ? homepage.secondaryTopics.map((row, index) => text(record(row, `seo.secondaryTopics[${index}]`).secondaryTopic, `seo.secondaryTopics[${index}]`, 80))
    : []

  return {
    identity: {
      id: text(source.id, 'identity.id', 200),
      siteId: 'tio2-a',
      path: '/',
      schemaVersion: 'homepage-v0.3-brand',
      status,
      modified,
    },
    hero: {
      eyebrow: text(homepage.heroEyebrow, 'hero.eyebrow', 100),
      heading: text(homepage.heroHeading, 'hero.heading', 100),
      summary: text(homepage.heroSummary, 'hero.summary'),
      image: image(homepage.heroImage, homepage.heroImageAlt),
      primaryLabel: text(brand.heroPrimaryLabel, 'hero.primaryLabel', 50),
      secondaryLabel: text(brand.heroSecondaryLabel, 'hero.secondaryLabel', 50),
    },
    about: {
      eyebrow: text(brand.aboutEyebrow, 'about.eyebrow', 100),
      heading: text(brand.aboutHeading, 'about.heading', 140),
      whoTitle: text(brand.whoTitle, 'about.whoTitle', 80),
      whoBody: text(brand.whoBody, 'about.whoBody'),
      whatTitle: text(brand.whatTitle, 'about.whatTitle', 80),
      whatBody: text(brand.whatBody, 'about.whatBody'),
      capabilities,
      metrics,
    },
    routes: {eyebrow: text(brand.routesEyebrow, 'routes.eyebrow'), heading: text(brand.routesHeading, 'routes.heading'), items: routes},
    applications: {eyebrow: text(brand.applicationsEyebrow, 'applications.eyebrow'), heading: text(brand.applicationsHeading, 'applications.heading'), intro: text(brand.applicationsIntro, 'applications.intro'), items: textItems(brand.brandApplications, 'applications.items', 6)},
    productFamilies: {eyebrow: text(brand.familiesEyebrow, 'productFamilies.eyebrow'), heading: text(brand.familiesHeading, 'productFamilies.heading'), intro: text(brand.familiesIntro, 'productFamilies.intro'), items: textItems(brand.productFamilies, 'productFamilies.items', 8)},
    selection: {eyebrow: text(brand.selectionEyebrow, 'selection.eyebrow'), heading: text(brand.selectionHeading, 'selection.heading'), intro: text(brand.selectionIntro, 'selection.intro'), factors: textItems(brand.selectionFactors, 'selection.factors', 4)},
    resources: {eyebrow: text(brand.resourcesEyebrow, 'resources.eyebrow'), heading: text(brand.resourcesHeading, 'resources.heading'), items: resources},
    process: {eyebrow: text(brand.processEyebrow, 'process.eyebrow'), heading: text(brand.processHeading, 'process.heading'), steps: textItems(brand.evaluationSteps, 'process.steps', 5)},
    documents: {eyebrow: text(brand.documentsEyebrow, 'documents.eyebrow'), heading: text(brand.documentsHeading, 'documents.heading'), intro: text(brand.documentsIntro, 'documents.intro'), items: documents},
    inquiry: {
      eyebrow: text(brand.inquiryEyebrow, 'inquiry.eyebrow'),
      heading: text(brand.inquiryHeading, 'inquiry.heading'),
      intro: text(brand.inquiryIntro, 'inquiry.intro'),
      fieldLabels: exactRows(brand.inquiryFields, 'inquiry.fieldLabels', 6).map((row, index) => text(row.fieldLabel, `inquiry.fieldLabels[${index}]`, 80)),
      messageLabel: text(brand.inquiryMessageLabel, 'inquiry.messageLabel', 120),
      submitLabel: text(brand.inquirySubmitLabel, 'inquiry.submitLabel', 50),
      helperText: text(brand.inquiryHelperText, 'inquiry.helperText', 200),
      successHeading: text(brand.inquirySuccessHeading, 'inquiry.successHeading', 100),
      successMessage: text(brand.inquirySuccessMessage, 'inquiry.successMessage', 300),
    },
    faq: {eyebrow: text(brand.faqEyebrow, 'faq.eyebrow'), heading: text(brand.faqHeading, 'faq.heading'), items: faqItems},
    footer: {description: text(brand.footerDescription, 'footer.description')},
    seo: {
      title: text(homepage.seoTitle, 'seo.title', 60),
      description: text(homepage.seoDescription, 'seo.description', 160),
      ogImage: null,
      primaryTopic: text(homepage.primaryTopic, 'seo.primaryTopic', 80),
      secondaryTopics,
    },
  }
}
