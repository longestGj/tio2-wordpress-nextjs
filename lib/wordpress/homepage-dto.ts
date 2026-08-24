import type {SiteId} from '@/sites'

import type {HomepageFieldsFragment} from './generated'
import type {HomepageLinkPolicy} from './homepage-link-policy'
import {
  type HomepageRfqBehaviorField,
  validateHomepageRfqCopy,
} from './homepage-rfq-copy'
import {normalizeWordPressGmt} from './time'
import type {
  HomepageDto,
  HomepageImageDto,
  HomepageLinkCardDto,
} from './homepage-types'
import {CrossSiteContentError} from './types'

const SITE_IDS = new Set<SiteId>(['tio2-a', 'tio2-b'])
const SUPPORTED_IMAGE_MIME_TYPES = new Set<HomepageImageDto['mimeType']>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])
const SITE_PATH_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/u
type UnknownRecord = Record<string, unknown>

export class HomepageContractError extends Error {
  readonly fieldPath: string

  constructor(fieldPath: string, message = `Invalid homepage field: ${fieldPath}`) {
    super(message)
    this.name = 'HomepageContractError'
    this.fieldPath = fieldPath
  }
}

export class HomepageVersionError extends HomepageContractError {
  readonly actualVersion: string

  constructor(actualVersion: string) {
    super(
      'identity.schemaVersion',
      `Unsupported homepage schema version: ${actualVersion || 'missing'}`,
    )
    this.name = 'HomepageVersionError'
    this.actualVersion = actualVersion
  }
}

export interface HomepageAdapterOptions {
  readonly readMode?: 'formal' | 'preview'
  readonly linkPolicy: HomepageLinkPolicy
}

function record(value: unknown, fieldPath: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HomepageContractError(fieldPath)
  }

  return value as UnknownRecord
}

function rows(
  value: unknown,
  fieldPath: string,
  min: number,
  max: number,
): readonly unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new HomepageContractError(fieldPath)
  }

  return value
}

function boundedText(
  value: unknown,
  fieldPath: string,
  max: number | null,
  required = true,
): string {
  if (typeof value !== 'string') {
    throw new HomepageContractError(fieldPath)
  }

  const result = value.trim()
  if (
    (required && result.length === 0) ||
    (max !== null && result.length > max) ||
    /<[^>]*>/u.test(result)
  ) {
    throw new HomepageContractError(fieldPath)
  }

  return result
}

function rfqBehaviorText(
  value: unknown,
  siteId: SiteId,
  fieldPath: HomepageRfqBehaviorField,
  max: number,
): string {
  if (typeof value !== 'string') {
    throw new HomepageContractError(fieldPath)
  }
  try {
    const result = validateHomepageRfqCopy(siteId, fieldPath, value)
    if (result.length > max || /<[^>]*>/u.test(result)) {
      throw new HomepageContractError(fieldPath)
    }
    return result
  } catch {
    throw new HomepageContractError(
      fieldPath,
      `Unsupported site-scoped homepage RFQ copy: ${fieldPath}`,
    )
  }
}

function sitePath(value: unknown, fieldPath: string, max = 172): string {
  const result = boundedText(value, fieldPath, max)
  if (result === '/' || !SITE_PATH_PATTERN.test(result)) {
    throw new HomepageContractError(fieldPath)
  }

  return result
}

function claimEvidence(
  row: UnknownRecord,
  fieldPath: string,
  basisKey: string,
  evidenceKey: string,
): void {
  const basisValues = rows(row[basisKey], `${fieldPath}.claimBasis`, 1, 1)
  const basis = boundedText(
    basisValues[0],
    `${fieldPath}.claimBasis`,
    null,
  )
  if (basis !== 'user_confirmed' && basis !== 'source_required') {
    throw new HomepageContractError(`${fieldPath}.claimBasis`)
  }

  const evidenceUrl = boundedText(
    row[evidenceKey] ?? '',
    `${fieldPath}.evidenceUrl`,
    null,
    false,
  )
  if (basis === 'source_required') {
    try {
      const parsed = new URL(evidenceUrl)
      if (parsed.protocol !== 'https:') {
        throw new Error('HTTPS required')
      }
    } catch {
      throw new HomepageContractError(`${fieldPath}.evidenceUrl`)
    }
  } else if (evidenceUrl) {
    try {
      if (new URL(evidenceUrl).protocol !== 'https:') {
        throw new Error('HTTPS required')
      }
    } catch {
      throw new HomepageContractError(`${fieldPath}.evidenceUrl`)
    }
  }
}

function positiveDimension(value: unknown, fieldPath: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new HomepageContractError(fieldPath)
  }
  return value as number
}

function imageDto(
  value: unknown,
  altValue: unknown,
  fieldPath: string,
  requiredAlt = false,
): HomepageImageDto | null {
  const alt = boundedText(
    altValue ?? '',
    `${fieldPath}.alt`,
    160,
    requiredAlt && value !== null && value !== undefined,
  )
  if (value === null || value === undefined) {
    if (alt) {
      throw new HomepageContractError(`${fieldPath}Alt`)
    }
    return null
  }

  const edge = record(value, fieldPath)
  const source = record(edge.node, `${fieldPath}.node`)
  const src = boundedText(source.mediaItemUrl, `${fieldPath}.src`, null)
  const mimeType = boundedText(source.mimeType, `${fieldPath}.mimeType`, null)
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType as HomepageImageDto['mimeType'])) {
    throw new HomepageContractError(`${fieldPath}.mimeType`)
  }
  const details = record(source.mediaDetails, `${fieldPath}.mediaDetails`)

  return {
    src,
    alt,
    width: positiveDimension(details.width, `${fieldPath}.width`),
    height: positiveDimension(details.height, `${fieldPath}.height`),
    mimeType: mimeType as HomepageImageDto['mimeType'],
  }
}

function unique(values: readonly string[], fieldPaths: readonly string[]): void {
  const seen = new Set<string>()
  values.forEach((value, index) => {
    const key = value.toLocaleLowerCase('en-US')
    if (seen.has(key)) {
      throw new HomepageContractError(fieldPaths[index])
    }
    seen.add(key)
  })
}

function linkCards(
  value: unknown,
  linkPolicy: HomepageLinkPolicy,
  config: {
    readonly fieldPath: string
    readonly min: number
    readonly max: number
    readonly titleKey: string
    readonly summaryKey: string
    readonly pathKey: string
    readonly imageKey: string
    readonly imageAltKey: string
    readonly titleMax: number | null
    readonly summaryMax: number | null
  },
): readonly HomepageLinkCardDto[] {
  const cards = rows(value, config.fieldPath, config.min, config.max).map(
    (rawRow, index) => {
      const rowPath = `${config.fieldPath}[${index}]`
      const row = record(rawRow, rowPath)
      const path = sitePath(row[config.pathKey], `${rowPath}.href`)
      return {
        path,
        title: boundedText(row[config.titleKey], `${rowPath}.title`, config.titleMax),
        summary: boundedText(
          row[config.summaryKey],
          `${rowPath}.summary`,
          config.summaryMax,
        ),
        href: linkPolicy.isPublic(path) ? path : null,
        image: imageDto(
          row[config.imageKey],
          row[config.imageAltKey],
          `${rowPath}.image`,
        ),
      }
    },
  )
  unique(
    cards.map(({path}) => path),
    cards.map((_, index) => `${config.fieldPath}[${index}].href`),
  )
  return cards
}

function siteId(value: string): SiteId {
  if (!SITE_IDS.has(value as SiteId)) {
    throw new HomepageContractError('identity.siteId')
  }
  return value as SiteId
}

export function toHomepageDto(
  sourceValue: HomepageFieldsFragment,
  expectedSiteIdValue: string,
  options: HomepageAdapterOptions,
): HomepageDto {
  const source = record(sourceValue, 'homepage')
  const expectedSiteId = siteId(expectedSiteIdValue)
  const scopeValue = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(scopeValue)) {
    throw new HomepageContractError('identity.siteScopes')
  }
  const scopes = scopeValue
  const actualSiteIds = scopes.map((scope, index) =>
    boundedText(
      record(scope, `identity.siteScopes[${index}]`).slug,
      `identity.siteScopes[${index}].slug`,
      null,
    ),
  )
  if (actualSiteIds.length !== 1 || actualSiteIds[0] !== expectedSiteId) {
    throw new CrossSiteContentError(expectedSiteId, actualSiteIds)
  }
  if (options.linkPolicy.siteId !== expectedSiteId) {
    throw new HomepageContractError('links.siteId')
  }

  const fields = record(source.homepageFields, 'homepageFields')
  const schemaVersion = boundedText(
    fields.homepageSchemaVersion,
    'identity.schemaVersion',
    null,
  )
  if (schemaVersion !== 'homepage-v0.1') {
    throw new HomepageVersionError(schemaVersion)
  }
  const status = boundedText(source.status, 'identity.status', null)
  const expectedStatus = options.readMode === 'preview' ? 'draft' : 'publish'
  if (status !== expectedStatus) {
    throw new HomepageContractError('identity.status')
  }
  const modified = normalizeWordPressGmt(
    typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null,
  )
  if (!modified) {
    throw new HomepageContractError('identity.modified')
  }

  const metrics = rows(fields.metrics ?? [], 'metrics', 0, 4).map(
    (rawRow, index) => {
      const fieldPath = `metrics[${index}]`
      const row = record(rawRow, fieldPath)
      claimEvidence(row, fieldPath, 'metricClaimBasis', 'metricEvidenceUrl')
      return {
        value: boundedText(row.metricValue, `${fieldPath}.value`, 24),
        unit: boundedText(row.metricUnit ?? '', `${fieldPath}.unit`, 16, false),
        label: boundedText(row.metricLabel, `${fieldPath}.label`, 60),
        context: boundedText(row.metricContext ?? '', `${fieldPath}.context`, 120, false),
      }
    },
  )
  const productRoutes = linkCards(fields.productRoutes, options.linkPolicy, {
    fieldPath: 'productRoutes',
    min: 2,
    max: 6,
    titleKey: 'productTitle',
    summaryKey: 'productSummary',
    pathKey: 'productPath',
    imageKey: 'productImage',
    imageAltKey: 'productImageAlt',
    titleMax: 80,
    summaryMax: 220,
  })
  const applications = linkCards(fields.applications, options.linkPolicy, {
    fieldPath: 'applications',
    min: 3,
    max: 6,
    titleKey: 'applicationName',
    summaryKey: 'applicationSummary',
    pathKey: 'applicationPath',
    imageKey: 'applicationImage',
    imageAltKey: 'applicationImageAlt',
    titleMax: null,
    summaryMax: null,
  })
  const inquirySteps = rows(fields.inquirySteps, 'inquiry.steps', 3, 3).map(
    (rawRow, index) => {
      const fieldPath = `inquiry.steps[${index}]`
      const row = record(rawRow, fieldPath)
      return {
        number: index + 1,
        title: boundedText(row.inquiryStepTitle, `${fieldPath}.title`, 70),
        description: boundedText(
          row.inquiryStepDescription,
          `${fieldPath}.description`,
          220,
        ),
      }
    },
  )
  const trustReasons = rows(fields.trustReasons, 'trust.reasons', 3, 4).map(
    (rawRow, index) => {
      const fieldPath = `trust.reasons[${index}]`
      const row = record(rawRow, fieldPath)
      claimEvidence(
        row,
        fieldPath,
        'trustReasonClaimBasis',
        'trustReasonEvidenceUrl',
      )
      return {
        title: boundedText(row.trustReasonTitle, `${fieldPath}.title`, null),
        description: boundedText(
          row.trustReasonDescription,
          `${fieldPath}.description`,
          null,
        ),
      }
    },
  )
  const labels = record(fields.rfqLabels, 'rfq.labels')
  const faqItems = rows(fields.faqs, 'faq.items', 3, 6).map(
    (rawRow, index) => {
      const fieldPath = `faq.items[${index}]`
      const row = record(rawRow, fieldPath)
      const relatedLabel = boundedText(
        row.faqRelatedLabel ?? '',
        `${fieldPath}.relatedLabel`,
        null,
        false,
      )
      const relatedPath = boundedText(
        row.faqRelatedPath ?? '',
        `${fieldPath}.relatedPath`,
        null,
        false,
      )
      if (Boolean(relatedLabel) !== Boolean(relatedPath)) {
        throw new HomepageContractError(`${fieldPath}.relatedLink`)
      }
      const path = relatedLabel
        ? sitePath(relatedPath, `${fieldPath}.relatedPath`)
        : null
      return {
        question: boundedText(row.faqQuestion, `${fieldPath}.question`, 160),
        answer: boundedText(row.faqAnswer, `${fieldPath}.answer`, 600),
        relatedLink: relatedLabel && path && options.linkPolicy.isPublic(path)
          ? {label: relatedLabel, href: path}
          : null,
      }
    },
  )
  unique(
    faqItems.map(({question}) => question),
    faqItems.map((_, index) => `faq.items[${index}].question`),
  )
  const secondaryTopics = rows(
    fields.secondaryTopics ?? [],
    'seo.secondaryTopics',
    0,
    10,
  ).map((rawRow, index) =>
    boundedText(
      record(rawRow, `seo.secondaryTopics[${index}]`).secondaryTopic,
      `seo.secondaryTopics[${index}]`,
      80,
    ),
  )
  unique(
    secondaryTopics,
    secondaryTopics.map((_, index) => `seo.secondaryTopics[${index}]`),
  )
  const ogImageValue = fields.ogImage
  const ogImageAlt = ogImageValue === null || ogImageValue === undefined
    ? ''
    : record(
        record(ogImageValue, 'seo.ogImage').node,
        'seo.ogImage.node',
      ).altText

  return {
    identity: {
      id: boundedText(source.id, 'identity.id', null),
      siteId: expectedSiteId,
      path: '/',
      schemaVersion: 'homepage-v0.1',
      status,
      modified,
    },
    hero: {
      eyebrow: boundedText(fields.heroEyebrow, 'hero.eyebrow', 80),
      heading: boundedText(fields.heroHeading, 'hero.heading', 90),
      summary: boundedText(fields.heroSummary, 'hero.summary', 320),
      primaryCta: {
        label: boundedText(fields.heroPrimaryLabel, 'hero.primaryCta.label', 32),
        href: '#rfq',
      },
      secondaryCta: (() => {
        const label = boundedText(fields.heroSecondaryLabel, 'hero.secondaryCta.label', 32)
        const path = sitePath(fields.heroSecondaryPath, 'hero.secondaryCta.href')
        return options.linkPolicy.isPublic(path) ? {label, href: path} : null
      })(),
      image: imageDto(fields.heroImage, fields.heroImageAlt, 'hero.image'),
    },
    metrics,
    productDiscovery: {
      heading: boundedText(fields.productsHeading, 'productDiscovery.heading', 90),
      intro: boundedText(fields.productsIntro, 'productDiscovery.intro', 240),
    },
    productRoutes,
    applicationDiscovery: {
      heading: boundedText(fields.applicationsHeading, 'applicationDiscovery.heading', 90),
      intro: boundedText(fields.applicationsIntro, 'applicationDiscovery.intro', 240),
    },
    applications,
    inquiry: {
      heading: boundedText(fields.inquiryHeading, 'inquiry.heading', 90),
      steps: inquirySteps,
    },
    trust: {
      heading: boundedText(fields.trustHeading, 'trust.heading', 90),
      intro: boundedText(fields.trustIntro, 'trust.intro', 240),
      reasons: trustReasons,
    },
    rfq: {
      heading: boundedText(fields.rfqHeading, 'rfq.heading', 90),
      intro: rfqBehaviorText(fields.rfqIntro, expectedSiteId, 'rfq.intro', 260),
      labels: {
        name: boundedText(labels.rfqLabelName, 'rfq.labels.name', null),
        company: boundedText(labels.rfqLabelCompany, 'rfq.labels.company', null),
        countryRegion: boundedText(labels.rfqLabelCountryRegion, 'rfq.labels.countryRegion', null),
        workEmail: boundedText(labels.rfqLabelWorkEmail, 'rfq.labels.workEmail', null),
        buyerType: boundedText(labels.rfqLabelBuyerType, 'rfq.labels.buyerType', null),
        interest: boundedText(labels.rfqLabelInterest, 'rfq.labels.interest', null),
        expectedQuantity: boundedText(labels.rfqLabelExpectedQuantity, 'rfq.labels.expectedQuantity', null),
        destination: boundedText(labels.rfqLabelDestination, 'rfq.labels.destination', null),
        message: boundedText(labels.rfqLabelMessage, 'rfq.labels.message', null),
        privacy: boundedText(labels.rfqLabelPrivacy, 'rfq.labels.privacy', null),
        buyerIndustrial: boundedText(labels.rfqBuyerIndustrialLabel, 'rfq.labels.buyerIndustrial', null),
        buyerDistributor: boundedText(labels.rfqBuyerDistributorLabel, 'rfq.labels.buyerDistributor', null),
        buyerOther: boundedText(labels.rfqBuyerOtherLabel, 'rfq.labels.buyerOther', null),
      },
      submitLabel: boundedText(fields.rfqSubmitLabel, 'rfq.submitLabel', 32),
      privacyText: rfqBehaviorText(fields.rfqPrivacyText, expectedSiteId, 'rfq.privacyText', 240),
      success: {
        heading: rfqBehaviorText(fields.rfqSuccessHeading, expectedSiteId, 'rfq.success.heading', 80),
        message: rfqBehaviorText(fields.rfqSuccessMessage, expectedSiteId, 'rfq.success.message', 240),
      },
    },
    faq: {
      heading: boundedText(fields.faqHeading, 'faq.heading', 90),
      items: faqItems,
    },
    closingCta: {
      heading: boundedText(fields.closingHeading, 'closingCta.heading', 90),
      body: boundedText(fields.closingBody, 'closingCta.body', 220),
      label: boundedText(fields.closingLabel, 'closingCta.label', 32),
      href: '#rfq',
    },
    seo: {
      title: boundedText(fields.seoTitle, 'seo.title', 60),
      description: boundedText(fields.seoDescription, 'seo.description', 160),
      ogImage: imageDto(ogImageValue, ogImageAlt, 'seo.ogImage'),
      primaryTopic: boundedText(fields.primaryTopic, 'seo.primaryTopic', 80),
      secondaryTopics,
    },
  }
}
