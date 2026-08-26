import {normalizePlainText} from '@/lib/seo/text'

import type {SiteAEditorialHomepageFieldsFragment} from './generated'
import {
  HomepageContractError,
  HomepageVersionError,
} from './homepage-dto'
import type {HomepageImageDto} from './homepage-types'
import type {
  EditorialClaimBasis,
  EditorialVerificationStatus,
  SiteAEditorialHomepageDto,
} from './homepage-v02-types'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'

type UnknownRecord = Record<string, unknown>
type ReadMode = NonNullable<SiteAEditorialAdapterOptions['readMode']>

const SITE_ID = 'tio2-a' as const
const SCHEMA_VERSION = 'homepage-v0.2-editorial-geo' as const
const CLAIM_BASES = new Set<EditorialClaimBasis>([
  'synthetic_demo',
  'user_confirmed',
  'source_document',
])
const VERIFICATION_STATUSES = new Set<EditorialVerificationStatus>([
  'demo',
  'needs_review',
  'verified',
])
const SUPPORTED_IMAGE_MIME_TYPES = new Set<HomepageImageDto['mimeType']>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])
const WORDPRESS_TAG_REWRITE_PATTERN = /<(?:!--[\s\S]*?(?:-->|$)|\?[\s\S]*?(?:\?>|$)|\/?[a-z][^>]*(?:>|$)|![a-z][^>]*(?:>|$))/iu
const STRICT_REVIEW_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u

export interface SiteAEditorialAdapterOptions {
  readonly readMode?: 'published' | 'preview'
  readonly rfqHref: string
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

function nullableRows(
  value: unknown,
  fieldPath: string,
  max: number,
  readMode: ReadMode,
): readonly unknown[] {
  if (value === null) {
    if (readMode === 'preview') throw new HomepageContractError(fieldPath)
    return []
  }
  return rows(value, fieldPath, 0, max)
}

function text(
  value: unknown,
  fieldPath: string,
  max: number | null,
  required = true,
): string {
  if (typeof value !== 'string') {
    throw new HomepageContractError(fieldPath)
  }
  const trimmed = value.trim()
  if (
    (required && !trimmed) ||
    (max !== null && Array.from(trimmed).length > max) ||
    WORDPRESS_TAG_REWRITE_PATTERN.test(trimmed)
  ) {
    throw new HomepageContractError(fieldPath)
  }
  return normalizePlainText(trimmed, Number.MAX_SAFE_INTEGER)
}

function nullableText(
  value: unknown,
  fieldPath: string,
  max: number | null,
  required: boolean,
  readMode: ReadMode,
): string {
  if (value === null) {
    if (required || readMode === 'preview') {
      throw new HomepageContractError(fieldPath)
    }
    return ''
  }
  return text(value, fieldPath, max, required)
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

function hasHttpsAuthorityUserInfo(value: string): boolean {
  const authority = value
    .slice('https://'.length)
    .split(/[/?#]/u, 1)[0] ?? ''
  return authority.includes('@')
}

function enumValue<T extends string>(
  value: unknown,
  fieldPath: string,
  readMode: ReadMode,
  allowed: ReadonlySet<T>,
): T {
  const scalar = readMode === 'published'
    ? Array.isArray(value) && value.length === 1
      ? value[0]
      : undefined
    : typeof value === 'string'
      ? value
      : undefined
  const normalized = text(scalar, fieldPath, null)
  if (!allowed.has(normalized as T)) {
    throw new HomepageContractError(fieldPath)
  }
  return normalized as T
}

function httpsUrl(
  value: unknown,
  fieldPath: string,
  required: boolean,
  readMode: ReadMode,
): string | null {
  if (value === null) {
    if (required || readMode === 'preview') {
      throw new HomepageContractError(fieldPath)
    }
    return null
  }
  const normalized = text(value, fieldPath, null, required)
  if (!normalized) return null

  try {
    const parsed = new URL(normalized)
    if (
      !normalized.startsWith('https://') ||
      /\s/u.test(normalized) ||
      hasHttpsAuthorityUserInfo(normalized) ||
      parsed.protocol !== 'https:' ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error('Invalid evidence URL')
    }
  } catch {
    throw new HomepageContractError(fieldPath)
  }
  return normalized
}

function rfqHref(value: unknown): string {
  const normalized = text(value, 'headerRfq.href', null)
  try {
    const parsed = new URL(normalized)
    const validMailto =
      parsed.protocol === 'mailto:' &&
      !parsed.hostname &&
      Boolean(parsed.pathname) &&
      !parsed.search &&
      !parsed.hash
    const validHttps =
      parsed.protocol === 'https:' &&
      Boolean(parsed.hostname) &&
      !hasHttpsAuthorityUserInfo(normalized) &&
      !parsed.username &&
      !parsed.password
    if (!validMailto && !validHttps) {
      throw new Error('Invalid RFQ URL')
    }
  } catch {
    throw new HomepageContractError('headerRfq.href')
  }
  return normalized
}

function positiveDimension(value: unknown, fieldPath: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new HomepageContractError(fieldPath)
  }
  return value as number
}

function image(
  value: unknown,
  altValue: unknown,
  fieldPath: string,
  requireAlt: boolean,
  readMode: ReadMode,
): HomepageImageDto | null {
  if (value === undefined) {
    throw new HomepageContractError(fieldPath)
  }
  const alt = nullableText(
    altValue,
    `${fieldPath}.alt`,
    160,
    requireAlt && value !== null,
    readMode,
  )
  if (value === null) {
    if (alt) throw new HomepageContractError(`${fieldPath}.alt`)
    return null
  }

  const edge = record(value, fieldPath)
  const node = record(edge.node, `${fieldPath}.node`)
  const details = record(node.mediaDetails, `${fieldPath}.mediaDetails`)
  const mimeType = text(node.mimeType, `${fieldPath}.mimeType`, null)
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType as HomepageImageDto['mimeType'])) {
    throw new HomepageContractError(`${fieldPath}.mimeType`)
  }

  return {
    src: text(node.mediaItemUrl, `${fieldPath}.src`, null),
    alt,
    width: positiveDimension(details.width, `${fieldPath}.width`),
    height: positiveDimension(details.height, `${fieldPath}.height`),
    mimeType: mimeType as HomepageImageDto['mimeType'],
  }
}

function strictReviewInstant(value: unknown): string {
  const normalized = text(value, 'editorial.reviewedAt', 24)
  if (
    !STRICT_REVIEW_INSTANT.test(normalized) ||
    Number.isNaN(Date.parse(normalized)) ||
    new Date(normalized).toISOString() !== normalized
  ) {
    throw new HomepageContractError('editorial.reviewedAt')
  }
  return normalized
}

export function toSiteAEditorialHomepageDto(
  sourceValue: SiteAEditorialHomepageFieldsFragment,
  options: SiteAEditorialAdapterOptions,
): SiteAEditorialHomepageDto {
  const source = record(sourceValue, 'homepage')
  const readMode = options.readMode ?? 'published'
  const scopes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(scopes)) {
    throw new HomepageContractError('identity.siteScopes')
  }
  const actualSiteIds = scopes.map((scope, index) =>
    text(
      record(scope, `identity.siteScopes[${index}]`).slug,
      `identity.siteScopes[${index}].slug`,
      null,
    ),
  )
  if (actualSiteIds.length !== 1 || actualSiteIds[0] !== SITE_ID) {
    throw new CrossSiteContentError(SITE_ID, actualSiteIds)
  }

  const homepage = record(source.homepageFields, 'homepageFields')
  const schemaVersion = typeof homepage.homepageSchemaVersion === 'string'
    ? homepage.homepageSchemaVersion.trim()
    : String(homepage.homepageSchemaVersion ?? '')
  if (schemaVersion !== SCHEMA_VERSION) {
    throw new HomepageVersionError(schemaVersion)
  }

  const status = text(source.status, 'identity.status', null)
  if (status !== (readMode === 'preview' ? 'draft' : 'publish')) {
    throw new HomepageContractError('identity.status')
  }
  const modified = normalizeWordPressGmt(
    typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null,
  )
  if (!modified) throw new HomepageContractError('identity.modified')

  const editorial = record(source.editorialGeoFields, 'editorialGeoFields')
  const reviewedAt = strictReviewInstant(editorial.editorialReviewedAt)
  const reviewedBy = text(editorial.editorialReviewedBy, 'editorial.reviewedBy', null)
  const reviewScope = text(editorial.editorialReviewScope, 'editorial.reviewScope', null)

  const decisionQuestions = rows(
    editorial.decisionQuestions,
    'decisionQuestions',
    1,
    12,
  ).map((rawRow, index) => {
    const fieldPath = `decisionQuestions[${index}]`
    const row = record(rawRow, fieldPath)
    return {
      number: text(row.decisionNumber, `${fieldPath}.number`, null),
      question: text(row.decisionQuestion, `${fieldPath}.question`, null),
      answer: text(row.decisionAnswer, `${fieldPath}.answer`, null),
    }
  })
  unique(
    decisionQuestions.map(({number}) => number),
    decisionQuestions.map((_, index) => `decisionQuestions[${index}].number`),
  )
  unique(
    decisionQuestions.map(({question}) => question),
    decisionQuestions.map((_, index) => `decisionQuestions[${index}].question`),
  )

  const applicationBriefs = rows(
    editorial.applicationBriefs,
    'applicationBriefs',
    1,
    12,
  ).map((rawRow, index) => {
    const fieldPath = `applicationBriefs[${index}]`
    const row = record(rawRow, fieldPath)
    return {
      name: text(row.applicationName, `${fieldPath}.name`, null),
      summary: text(row.applicationSummary, `${fieldPath}.summary`, null),
      considerations: text(
        row.applicationConsiderations,
        `${fieldPath}.considerations`,
        null,
      ),
    }
  })

  const supplyRoutes = rows(
    editorial.supplyRoutes,
    'supplyRoutes',
    1,
    6,
  ).map((rawRow, index) => {
    const fieldPath = `supplyRoutes[${index}]`
    const row = record(rawRow, fieldPath)
    const claimBasis = enumValue(
      row.claimBasis,
      `${fieldPath}.claimBasis`,
      readMode,
      CLAIM_BASES,
    )
    return {
      name: text(row.routeName, `${fieldPath}.name`, null),
      meaning: text(row.routeMeaning, `${fieldPath}.meaning`, null),
      buyerVerification: text(
        row.buyerVerification,
        `${fieldPath}.buyerVerification`,
        null,
      ),
      documentationContext: text(
        row.documentationContext,
        `${fieldPath}.documentationContext`,
        null,
      ),
      claimBasis,
      evidenceUrl: httpsUrl(
        row.evidenceUrl,
        `${fieldPath}.evidenceUrl`,
        claimBasis === 'source_document',
        readMode,
      ),
    }
  })

  const evidenceItems = nullableRows(
    editorial.evidenceItems,
    'evidenceItems',
    12,
    readMode,
  ).map((rawRow, index) => {
    const fieldPath = `evidenceItems[${index}]`
    const row = record(rawRow, fieldPath)
    const verificationStatus = enumValue(
      row.verificationStatus,
      `${fieldPath}.verificationStatus`,
      readMode,
      VERIFICATION_STATUSES,
    )
    return {
      documentType: text(row.documentType, `${fieldPath}.documentType`, null),
      title: text(row.documentTitle, `${fieldPath}.title`, null),
      summary: text(row.documentSummary, `${fieldPath}.summary`, null),
      applicability: text(row.applicability, `${fieldPath}.applicability`, null),
      revisionLabel: nullableText(
        row.revisionLabel,
        `${fieldPath}.revisionLabel`,
        null,
        false,
        readMode,
      ),
      evidenceUrl: httpsUrl(
        row.evidenceUrl,
        `${fieldPath}.evidenceUrl`,
        verificationStatus === 'verified',
        readMode,
      ),
      verificationStatus,
    }
  })

  const evaluationSteps = rows(
    editorial.evaluationSteps,
    'evaluationSteps',
    1,
    10,
  ).map((rawRow, index) => {
    const fieldPath = `evaluationSteps[${index}]`
    const row = record(rawRow, fieldPath)
    return {
      number: text(row.methodNumber, `${fieldPath}.number`, null),
      title: text(row.methodTitle, `${fieldPath}.title`, null),
      description: text(row.methodDescription, `${fieldPath}.description`, null),
    }
  })

  const faqItems = rows(editorial.geoFaqs, 'faq.items', 3, 20).map(
    (rawRow, index) => {
      const fieldPath = `faq.items[${index}]`
      const row = record(rawRow, fieldPath)
      return {
        question: text(row.faqQuestion, `${fieldPath}.question`, 160),
        answer: text(row.faqAnswer, `${fieldPath}.answer`, 600),
        relatedLink: null,
      }
    },
  )
  unique(
    faqItems.map(({question}) => question),
    faqItems.map((_, index) => `faq.items[${index}].question`),
  )

  const glossary = nullableRows(
    editorial.glossaryItems,
    'glossary',
    30,
    readMode,
  ).map((rawRow, index) => {
    const fieldPath = `glossary[${index}]`
    const row = record(rawRow, fieldPath)
    return {
      term: text(row.term, `${fieldPath}.term`, null),
      definition: text(row.definition, `${fieldPath}.definition`, null),
    }
  })
  unique(
    glossary.map(({term}) => term),
    glossary.map((_, index) => `glossary[${index}].term`),
  )

  const secondaryTopics = nullableRows(
    homepage.secondaryTopics,
    'seo.secondaryTopics',
    10,
    readMode,
  ).map((rawRow, index) =>
    text(
      record(rawRow, `seo.secondaryTopics[${index}]`).secondaryTopic,
      `seo.secondaryTopics[${index}]`,
      80,
    ),
  )
  unique(
    secondaryTopics,
    secondaryTopics.map((_, index) => `seo.secondaryTopics[${index}]`),
  )

  const configuredRfqHref = rfqHref(options.rfqHref)
  const ogImageValue = homepage.ogImage
  const ogImageAlt = ogImageValue === null || ogImageValue === undefined
    ? ''
    : record(
        record(ogImageValue, 'seo.ogImage').node,
        'seo.ogImage.node',
      ).altText

  return {
    identity: {
      id: text(source.id, 'identity.id', null),
      siteId: SITE_ID,
      path: '/',
      schemaVersion: SCHEMA_VERSION,
      status,
      modified,
    },
    hero: {
      eyebrow: text(homepage.heroEyebrow, 'hero.eyebrow', 80),
      heading: text(homepage.heroHeading, 'hero.heading', 90),
      summary: text(homepage.heroSummary, 'hero.summary', 320),
      image: image(
        homepage.heroImage,
        homepage.heroImageAlt,
        'hero.image',
        true,
        readMode,
      ),
    },
    headerRfq: {
      label: text(editorial.headerRfqLabel, 'headerRfq.label', 32),
      href: configuredRfqHref,
    },
    directAnswer: {
      question: text(
        editorial.directAnswerQuestion,
        'directAnswer.question',
        null,
      ),
      lead: text(editorial.directAnswerLead, 'directAnswer.lead', null),
      body: text(editorial.directAnswerBody, 'directAnswer.body', null),
    },
    decisionQuestions,
    applicationBriefs,
    supplyRoutes,
    evidenceItems,
    evaluationSteps,
    faq: {
      heading: 'Frequently asked questions',
      items: faqItems,
    },
    glossary,
    editorial: {reviewedAt, reviewedBy, reviewScope},
    closingCta: {
      heading: text(homepage.closingHeading, 'closingCta.heading', 90),
      body: text(homepage.closingBody, 'closingCta.body', 220),
      label: text(homepage.closingLabel, 'closingCta.label', 32),
      href: configuredRfqHref,
    },
    seo: {
      title: text(homepage.seoTitle, 'seo.title', 60),
      description: text(homepage.seoDescription, 'seo.description', 160),
      ogImage: image(
        ogImageValue,
        ogImageAlt,
        'seo.ogImage',
        false,
        readMode,
      ),
      primaryTopic: text(homepage.primaryTopic, 'seo.primaryTopic', 80),
      secondaryTopics,
    },
  }
}
