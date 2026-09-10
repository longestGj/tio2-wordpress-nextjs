import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-contact-page.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import type {MalaysiaContactPageDto} from './contact-page-v01-types'

export interface MalaysiaContactPageSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly malaysiaContactPageContractJson: unknown
}

export class ContactPageContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia Contact page contract field: ${field}`)
    this.name = 'ContactPageContractError'
  }
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ContactPageContractError(field)
  return value as Record<string, unknown>
}

function exactFact(value: unknown, key: 'generalInquiries' | 'operatingCompany' | 'manufacturingSite') {
  const candidate = object(value, `contactDetails.${key}`)
  const expected = approved.contactDetails[key]
  return candidate.label === expected.label && candidate.value === expected.value ? expected : null
}

export function toMalaysiaContactPageDto(source: MalaysiaContactPageSource): MalaysiaContactPageDto {
  const scopes = object(source.siteScopes, 'siteScopes').nodes
  const actualScopes = Array.isArray(scopes)
    ? scopes.flatMap((node) => typeof object(node, 'siteScopes.nodes').slug === 'string' ? [object(node, 'siteScopes.nodes').slug as string] : [])
    : []
  if (actualScopes.length !== 1 || actualScopes[0] !== 'tio2-my') throw new CrossSiteContentError('tio2-my', actualScopes)
  if (source.status !== 'publish') throw new ContactPageContractError('status')
  const path = object(source.publishingFields, 'publishingFields').publicPath
  if (path !== '/contact') throw new ContactPageContractError('publishingFields.publicPath')
  if (typeof source.id !== 'string' || !source.id) throw new ContactPageContractError('id')
  if (typeof source.modifiedGmt !== 'string') throw new ContactPageContractError('modifiedGmt')
  const modified = normalizeWordPressGmt(source.modifiedGmt)
  if (!modified) throw new ContactPageContractError('modifiedGmt')
  let parsed: unknown
  try { parsed = JSON.parse(String(source.malaysiaContactPageContractJson)) } catch { throw new ContactPageContractError('contractJson') }
  const contract = object(parsed, 'contractJson')
  const identity = object(contract.identity, 'identity')
  if (
    identity.pageId !== approved.identity.pageId || identity.siteScope !== approved.identity.siteScope ||
    identity.locale !== approved.identity.locale || identity.path !== approved.identity.path ||
    identity.contractVersion !== approved.identity.contractVersion
  ) throw new ContactPageContractError('identity')
  const details = object(contract.contactDetails, 'contactDetails')
  const copy = structuredClone(approved)
  return {
    ...copy,
    identity: {
      id: source.id, pageId: 'CONTACT-001', siteId: 'tio2-my', locale: 'en', path: '/contact',
      contractVersion: 'contact-page-v0.1-malaysia', status: 'publish', modified,
    },
    contactDetails: {
      heading: approved.contactDetails.heading,
      introBase: approved.contactDetails.introBase,
      introDetails: approved.contactDetails.introDetails,
      generalInquiries: exactFact(details.generalInquiries, 'generalInquiries'),
      operatingCompany: exactFact(details.operatingCompany, 'operatingCompany'),
      manufacturingSite: exactFact(details.manufacturingSite, 'manufacturingSite'),
    },
    globalChrome,
  }
}
