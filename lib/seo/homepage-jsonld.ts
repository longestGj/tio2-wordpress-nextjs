import type {AnyHomepageDto} from '@/lib/wordpress/homepage-types'
import type {HomepageDto} from '@/lib/wordpress/homepage-types'
import type {SiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-types'
import type {SiteABrandHomepageDto} from '@/lib/wordpress/homepage-v03-types'
import type {MalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-types'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'
import {htmlToPlainText, normalizePlainText} from './text'

function isValidVisibleFaq(faq: {readonly items: readonly {readonly question: string; readonly answer: string}[]}): boolean {
  if (faq.items.length < 3 || faq.items.length > 6) return false

  const questions = new Set<string>()
  for (const item of faq.items) {
    const question = normalizePlainText(item.question, 160)
    const answer = normalizePlainText(item.answer, 600)
    if (
      !question ||
      !answer ||
      question !== item.question ||
      answer !== item.answer
    ) {
      return false
    }
    const uniqueQuestion = question.toLocaleLowerCase('en-US')
    if (questions.has(uniqueQuestion)) return false
    questions.add(uniqueQuestion)
  }

  return true
}

function isMalaysiaHomepage(homepage: AnyHomepageDto): homepage is MalaysiaHomepageDto {
  return homepage.identity.siteId === 'tio2-my' &&
    homepage.identity.schemaVersion === 'homepage-v0.4-malaysia'
}

function hasVisibleFaq(
  homepage: AnyHomepageDto,
): homepage is HomepageDto | SiteABrandHomepageDto {
  return homepage.identity.schemaVersion === 'homepage-v0.1' ||
    homepage.identity.schemaVersion === 'homepage-v0.3-brand'
}

export function buildHomepageJsonLd(
  site: SiteConfig,
  homepage: MalaysiaHomepageDto,
): JsonLdObject
export function buildHomepageJsonLd(
  site: SiteConfig,
  homepage: HomepageDto | SiteAEditorialHomepageDto | SiteABrandHomepageDto,
): JsonLdObject[]
export function buildHomepageJsonLd(
  site: SiteConfig,
  homepage: AnyHomepageDto,
): JsonLdObject | JsonLdObject[]
export function buildHomepageJsonLd(
  site: SiteConfig,
  homepage: AnyHomepageDto,
): JsonLdObject | JsonLdObject[] {
  if (isMalaysiaHomepage(homepage)) {
    return homepage.schemaGraph as unknown as JsonLdObject
  }
  const canonical = new URL('/', site.url).href
  const organizationId = new URL('/#organization', site.url).href
  const websiteId = new URL('/#website', site.url).href
  const webpageId = new URL('/#webpage', site.url).href
  const pageObject: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': webpageId,
    url: canonical,
    name: normalizePlainText(homepage.seo.title, 60),
    description: normalizePlainText(homepage.seo.description, 160),
    isPartOf: {'@id': websiteId},
    about: {'@id': organizationId},
  }

  if (isStrictUtcInstant(homepage.identity.modified)) {
    pageObject.dateModified = homepage.identity.modified
  }

  const values: JsonLdObject[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId,
      name: htmlToPlainText(site.name, 60),
      url: canonical,
      email: site.contactEmail,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': websiteId,
      name: htmlToPlainText(site.name, 60),
      url: canonical,
      publisher: {'@id': organizationId},
    },
    pageObject,
  ]

  if (hasVisibleFaq(homepage) && isValidVisibleFaq(homepage.faq)) {
    values.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': new URL('/#faq', site.url).href,
      mainEntity: homepage.faq.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {'@type': 'Answer', text: item.answer},
      })),
    })
  }

  return values
}

export function serializeHomepageJsonLd(
  values: JsonLdObject | readonly JsonLdObject[],
): string {
  return serializeJsonLd(values)
}
