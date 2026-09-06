import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-page.json'
import approvedEvidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-evidence.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {
  AboutEvidenceState,
  MalaysiaAboutPageDto,
  PublicAboutFact,
  PublicHeroParagraph,
} from './about-page-v01-types'

type UnknownRecord = Record<string, unknown>
type Authorization = 'user_approved_public' | 'restricted' | 'not_public'

interface EvidenceFact {
  readonly key: string
  readonly authorization: Authorization
  readonly value: unknown
}

export class AboutPageContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia About page contract field: ${field}`)
    this.name = 'AboutPageContractError'
  }
}

export interface MalaysiaAboutPageSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaAboutPageContractJson: unknown
  readonly malaysiaAboutPageEvidenceJson: unknown
}

const primaryFactKeys = Object.freeze([
  'organization.name', 'location.full', 'product.main', 'scale.annual', 'scale.markets',
  'scale.customers', 'export.port', 'documents.support', 'compliance.support',
  'supplier.intent', 'areas.served',
] as const)

const heroBindings = Object.freeze([
  ['organization.name', 'location.full'],
  ['organization.name', 'location.full', 'product.main', 'export.port', 'documents.support'],
  ['organization.name', 'product.main', 'export.port', 'documents.support'],
  ['organization.name', 'export.port', 'documents.support'],
  ['organization.name', 'supplier.intent'],
  ['organization.name', 'documents.support', 'compliance.support'],
] as const)

const whoFactBindings: Readonly<Record<string, {readonly valueKey: string; readonly dependencies: readonly string[]}>> = Object.freeze({
  'Operating Company': {valueKey: 'organization.name', dependencies: ['organization.name']},
  Location: {valueKey: 'location.full', dependencies: ['organization.name', 'location.full']},
  'Main Product': {valueKey: 'product.main', dependencies: ['product.main']},
  'Annual Supply': {valueKey: 'scale.annual', dependencies: ['organization.name', 'scale.annual']},
  'Markets Served': {valueKey: 'scale.markets', dependencies: ['organization.name', 'scale.markets']},
  'Customer Base': {valueKey: 'scale.customers', dependencies: ['organization.name', 'scale.customers']},
  'Export Coordination': {valueKey: 'export.port', dependencies: ['organization.name', 'export.port']},
})

const whyBindings = Object.freeze([
  ['location.full'],
  ['location.full'],
  ['export.port', 'documents.support', 'compliance.support'],
  ['areas.served'],
] as const)

const whatBindings = Object.freeze([
  ['organization.name', 'product.main'],
  ['organization.name', 'product.main'],
  ['organization.name', 'documents.support'],
  ['organization.name', 'export.port'],
] as const)

const howBindings = Object.freeze([
  ['organization.name', 'product.main'],
  ['organization.name', 'product.main'],
  ['organization.name', 'documents.support'],
  ['organization.name', 'export.port'],
] as const)

const companyFactBindings: Readonly<Record<string, readonly string[]>> = Object.freeze({
  Company: ['organization.name'],
  Base: ['organization.name', 'location.full'],
  Focus: ['product.main'],
  Markets: ['organization.name', 'areas.served'],
  Audience: [],
})

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AboutPageContractError(field)
  return value as UnknownRecord
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new AboutPageContractError(field)
  return value
}

function parseJson(value: unknown, field: string): unknown {
  if (typeof value !== 'string' || !value.trim()) throw new AboutPageContractError(field)
  try { return JSON.parse(value) } catch { throw new AboutPageContractError(field) }
}

function authorization(value: unknown, field: string): Authorization {
  if (value !== 'user_approved_public' && value !== 'restricted' && value !== 'not_public') {
    throw new AboutPageContractError(field)
  }
  return value
}

function evidenceState(value: unknown): AboutEvidenceState {
  if (value !== 'sufficient' && value !== 'partial' && value !== 'restricted') {
    throw new AboutPageContractError('evidence.evidenceState')
  }
  return value
}

function validateEvidence(value: unknown): {
  readonly state: AboutEvidenceState
  readonly contentVersion: string
  readonly facts: ReadonlyMap<string, EvidenceFact>
} {
  const evidence = record(value, 'evidence')
  if (evidence.schemaVersion !== approvedEvidence.schemaVersion) throw new AboutPageContractError('evidence.schemaVersion')
  const contentVersion = text(evidence.contentVersion, 'evidence.contentVersion')
  if (contentVersion !== approvedEvidence.contentVersion) throw new AboutPageContractError('evidence.contentVersion')
  if (!Array.isArray(evidence.facts)) throw new AboutPageContractError('evidence.facts')

  const approvedByKey = new Map(approvedEvidence.facts.map((fact) => [fact.key, fact]))
  const facts = new Map<string, EvidenceFact>()
  for (const [index, raw] of evidence.facts.entries()) {
    const item = record(raw, `evidence.facts[${index}]`)
    const key = text(item.key, `evidence.facts[${index}].key`)
    const approved = approvedByKey.get(key)
    if (!approved || facts.has(key) || JSON.stringify(item.value) !== JSON.stringify(approved.value)) {
      throw new AboutPageContractError(`evidence.facts[${index}]`)
    }
    facts.set(key, {
      key,
      authorization: authorization(item.authorization, `evidence.facts[${index}].authorization`),
      value: item.value,
    })
  }
  if (facts.size !== approvedByKey.size || primaryFactKeys.some((key) => !facts.has(key))) {
    throw new AboutPageContractError('evidence.facts')
  }

  const state = evidenceState(evidence.evidenceState)
  const withheldCount = primaryFactKeys.filter((key) => facts.get(key)?.authorization !== 'user_approved_public').length
  if ((state === 'sufficient') !== (withheldCount === 0)) throw new AboutPageContractError('evidence.evidenceState')
  return {state, contentVersion, facts}
}

function isPublic(facts: ReadonlyMap<string, EvidenceFact>, key: string): boolean {
  return facts.get(key)?.authorization === 'user_approved_public'
}

function allPublic(facts: ReadonlyMap<string, EvidenceFact>, keys: readonly string[]): boolean {
  return keys.every((key) => isPublic(facts, key))
}

function publicText(facts: ReadonlyMap<string, EvidenceFact>, key: string): string | null {
  const fact = facts.get(key)
  return fact?.authorization === 'user_approved_public' && typeof fact.value === 'string' ? fact.value : null
}

function publicStringArray(facts: ReadonlyMap<string, EvidenceFact>, key: string): readonly string[] {
  const fact = facts.get(key)
  return fact?.authorization === 'user_approved_public' && Array.isArray(fact.value) && fact.value.every((item) => typeof item === 'string')
    ? Object.freeze([...fact.value] as string[])
    : Object.freeze([])
}

const approvedSerializedContract = JSON.stringify(approvedContract)

export function toMalaysiaAboutPageDto(sourceValue: MalaysiaAboutPageSource): MalaysiaAboutPageDto {
  const source = record(sourceValue, 'aboutPage')
  const nodes = record(source.siteScopes, 'identity.siteScopes').nodes
  if (!Array.isArray(nodes)) throw new AboutPageContractError('identity.siteScopes')
  const siteIds = nodes.map((value, index) => text(record(value, `identity.siteScopes[${index}]`).slug, `identity.siteScopes[${index}].slug`))
  if (siteIds.length !== 1 || siteIds[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', siteIds)

  const fields = record(source.publishingFields, 'publishingFields')
  if (fields.publicPath !== '/about') throw new AboutPageContractError('identity.path')
  if (text(source.status, 'identity.status') !== 'publish') throw new AboutPageContractError('identity.status')
  const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
  if (!modified) throw new AboutPageContractError('identity.modified')

  const contract = parseJson(source.malaysiaAboutPageContractJson, 'malaysiaAboutPageContractJson') as typeof approvedContract
  if (
    JSON.stringify(contract) !== approvedSerializedContract ||
    contract.globalChromeRef.contractId !== globalChrome.contractId ||
    contract.globalChromeRef.logoManifestId !== globalChrome.logoManifestId
  ) throw new AboutPageContractError('malaysiaAboutPageContractJson')

  const evidence = validateEvidence(parseJson(source.malaysiaAboutPageEvidenceJson, 'malaysiaAboutPageEvidenceJson'))
  const restricted = evidence.state === 'restricted'
  const detailedIdentityPublic = !restricted && allPublic(evidence.facts, [
    'organization.name', 'location.full', 'product.main',
  ])

  const heroParagraphs = restricted ? [] : contract.hero.paragraphs.flatMap((paragraph, index): readonly PublicHeroParagraph[] => (
    allPublic(evidence.facts, heroBindings[index] ?? [])
      ? [{id: `hero.paragraph.${index + 1}` as PublicHeroParagraph['id'], text: paragraph}]
      : []
  ))
  const whoFacts = contract.whoWeAre.facts.flatMap((fact): readonly PublicAboutFact[] => {
    if (restricted && !['Operating Company', 'Main Product'].includes(fact.label)) return []
    const binding = whoFactBindings[fact.label]
    if (!binding || !allPublic(evidence.facts, binding.dependencies)) return []
    const value = publicText(evidence.facts, binding.valueKey)
    return value ? [{label: fact.label, value, ...('href' in fact ? {href: fact.href} : {})}] : []
  })
  const whyItems = restricted ? [] : contract.whyMalaysia.items.filter((_, index) => allPublic(evidence.facts, whyBindings[index] ?? []))
  const whatItems = restricted ? [] : contract.whatWeDo.items.filter((_, index) => allPublic(evidence.facts, whatBindings[index] ?? []))
  const howItems = restricted ? [] : contract.howWeWork.items.filter((_, index) => allPublic(evidence.facts, howBindings[index] ?? []))
  const companyFacts = contract.companyFacts.items.flatMap((fact): readonly PublicAboutFact[] => {
    if (restricted && !['Company', 'Focus'].includes(fact.label)) return []
    return allPublic(evidence.facts, companyFactBindings[fact.label] ?? []) ? [fact] : []
  })

  const descriptionParts = restricted ? [] : [
    allPublic(evidence.facts, ['organization.name', 'location.full', 'product.main', 'documents.support', 'export.port'])
      ? contract.schema.organizationDescription.split(' The page states')[0]
      : null,
    allPublic(evidence.facts, ['organization.name', 'scale.annual', 'scale.markets', 'scale.customers'])
      ? `The page states${contract.schema.organizationDescription.split(' The page states')[1] ?? ''}`
      : null,
  ].filter((value): value is string => value !== null)

  const heroVisualVisible = !restricted && allPublic(evidence.facts, [
    'organization.name', 'product.main', 'location.full', 'export.port', 'areas.served',
  ])
  const marketsVisible = !restricted && allPublic(evidence.facts, ['organization.name', 'areas.served', 'documents.support', 'export.port'])
  const applicationsVisible = !restricted && allPublic(evidence.facts, ['organization.name', 'product.main'])
  const documentationVisible = !restricted && allPublic(evidence.facts, ['organization.name', 'documents.support'])
  const metadataDescriptionVisible = detailedIdentityPublic && allPublic(evidence.facts, [
    'organization.name', 'location.full', 'product.main', 'documents.support', 'export.port',
  ])
  const organizationName = publicText(evidence.facts, 'organization.name')
  const addressVisible = !restricted && organizationName !== null && isPublic(evidence.facts, 'location.full')
  const areasVisible = !restricted && organizationName !== null && isPublic(evidence.facts, 'areas.served')

  return {
    ...contract,
    identity: {
      ...contract.identity,
      id: text(source.id, 'identity.id'), siteId: 'tio2-my', path: '/about',
      schemaVersion: 'about-page-v0.1-malaysia', status: 'publish', modified,
    },
    hero: {
      ...contract.hero,
      eyebrow: detailedIdentityPublic ? contract.hero.eyebrow : 'ABOUT TIO2 MALAYSIA',
      h1: detailedIdentityPublic ? contract.hero.h1 : 'About TiO2 Malaysia',
      paragraphs: Object.freeze(heroParagraphs),
      visualVisible: heroVisualVisible,
    },
    whoWeAre: {...contract.whoWeAre, facts: Object.freeze(whoFacts)},
    whyMalaysia: whyItems.length ? {...contract.whyMalaysia, items: Object.freeze(whyItems)} : null,
    whatWeDo: whatItems.length ? {...contract.whatWeDo, items: Object.freeze(whatItems)} : null,
    markets: marketsVisible ? contract.markets : null,
    applications: applicationsVisible ? contract.applications : null,
    howWeWork: howItems.length ? {...contract.howWeWork, items: Object.freeze(howItems)} : null,
    documentation: documentationVisible ? contract.documentation : null,
    companyFacts: {...contract.companyFacts, items: Object.freeze(companyFacts)},
    finalCta: {...contract.finalCta, visualVisible: !restricted},
    seo: {
      ...contract.seo,
      title: detailedIdentityPublic ? contract.seo.title : 'About TiO2 Malaysia',
      openGraphTitle: detailedIdentityPublic ? contract.seo.openGraphTitle : 'About TiO2 Malaysia',
      description: metadataDescriptionVisible ? contract.seo.description : null,
    },
    schema: {
      ...contract.schema,
      organizationName,
      organizationDescription: descriptionParts.length ? descriptionParts.join(' ') : null,
      address: addressVisible ? contract.schema.address : null,
      areas: areasVisible ? publicStringArray(evidence.facts, 'areas.served') : Object.freeze([]),
    },
    evidence: {state: evidence.state, contentVersion: evidence.contentVersion},
    globalChrome,
  }
}
