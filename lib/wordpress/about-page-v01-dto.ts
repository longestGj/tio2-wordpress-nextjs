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

const outputBindings: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'hero.paragraph.1': ['organization.name', 'location.full'],
  'hero.paragraph.2': ['product.main', 'export.port', 'documents.support'],
  'hero.paragraph.3': ['product.main', 'export.port', 'documents.support'],
  'hero.paragraph.4': ['export.port', 'documents.support'],
  'hero.paragraph.5': ['supplier.intent'],
  'hero.paragraph.6': ['compliance.support'],
  'metadata.description': ['organization.name', 'location.full', 'documents.support', 'export.port'],
  'schema.organization.description.base': [
    'organization.name', 'location.full', 'product.main', 'documents.support', 'export.port',
  ],
  'schema.organization.description.scale': ['scale.annual', 'scale.markets', 'scale.customers'],
})

const primaryFactKeys = Object.freeze([
  'organization.name', 'location.full', 'product.main', 'scale.annual', 'scale.markets',
  'scale.customers', 'export.port', 'documents.support', 'compliance.support',
  'supplier.intent', 'areas.served',
] as const)
const scaleKeys = new Set<string>(['scale.annual', 'scale.markets', 'scale.customers'])
const restrictedStateKeys = new Set<string>([...scaleKeys, 'location.full'])
const alwaysPublicKeys = new Set<string>(['organization.name', 'product.main', 'supplier.intent'])
const authorizationRank: Readonly<Record<Authorization, number>> = {
  user_approved_public: 0,
  restricted: 1,
  not_public: 2,
}

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
  if (facts.size !== approvedByKey.size) throw new AboutPageContractError('evidence.facts')
  for (const key of alwaysPublicKeys) {
    if (facts.get(key)?.authorization !== 'user_approved_public') throw new AboutPageContractError(`evidence.safe.${key}`)
  }
  for (const [outputKey, dependencies] of Object.entries(outputBindings)) {
    const expectedRank = Math.max(...dependencies.map((key) => authorizationRank[facts.get(key)?.authorization ?? 'not_public']))
    const actual = facts.get(outputKey)?.authorization
    if (!actual || authorizationRank[actual] !== expectedRank) throw new AboutPageContractError(`evidence.atomic.${outputKey}`)
  }

  const restrictedPrimary = primaryFactKeys.filter((key) => facts.get(key)?.authorization !== 'user_approved_public')
  const matchesExactSet = (expected: ReadonlySet<string>) => (
    restrictedPrimary.length === expected.size && restrictedPrimary.every((key) => expected.has(key))
  )
  const derivedState: AboutEvidenceState = restrictedPrimary.length === 0
    ? 'sufficient'
    : matchesExactSet(scaleKeys)
      ? 'partial'
      : matchesExactSet(restrictedStateKeys)
        ? 'restricted'
        : (() => { throw new AboutPageContractError('evidence.restrictedPattern') })()
  if (evidence.evidenceState !== derivedState) throw new AboutPageContractError('evidence.evidenceState')
  return {state: derivedState, contentVersion, facts}
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
  const heroParagraphs = Array.from({length: 6}, (_, index) => {
    const id = `hero.paragraph.${index + 1}` as PublicHeroParagraph['id']
    const value = publicText(evidence.facts, id)
    return value ? {id, text: value} : null
  }).filter((item): item is PublicHeroParagraph => item !== null)
  const whoFactKeys: Readonly<Record<string, string>> = {
    'Operating Company': 'organization.name', Location: 'location.full', 'Main Product': 'product.main',
    'Annual Supply': 'scale.annual', 'Markets Served': 'scale.markets', 'Customer Base': 'scale.customers',
    'Export Coordination': 'export.port',
  }
  const whoFacts = contract.whoWeAre.facts.flatMap((fact): readonly PublicAboutFact[] => {
    const value = publicText(evidence.facts, whoFactKeys[fact.label] ?? '')
    return value ? [{label: fact.label, value, ...('href' in fact ? {href: fact.href} : {})}] : []
  })
  const descriptionParts = [
    publicText(evidence.facts, 'schema.organization.description.base'),
    publicText(evidence.facts, 'schema.organization.description.scale'),
  ].filter((value): value is string => value !== null)
  const locationPublic = publicText(evidence.facts, 'location.full') !== null

  return {
    ...contract,
    identity: {
      ...contract.identity,
      id: text(source.id, 'identity.id'), siteId: 'tio2-my', path: '/about',
      schemaVersion: 'about-page-v0.1-malaysia', status: 'publish', modified,
    },
    hero: {...contract.hero, paragraphs: Object.freeze(heroParagraphs)},
    whoWeAre: {...contract.whoWeAre, facts: Object.freeze(whoFacts)},
    seo: {...contract.seo, description: publicText(evidence.facts, 'metadata.description')},
    schema: {
      ...contract.schema,
      organizationName: publicText(evidence.facts, 'organization.name') as string,
      organizationDescription: descriptionParts.length ? descriptionParts.join(' ') : null,
      address: locationPublic ? contract.schema.address : null,
      areas: publicStringArray(evidence.facts, 'areas.served'),
    },
    evidence: {state: evidence.state, contentVersion: evidence.contentVersion},
    globalChrome,
  }
}
