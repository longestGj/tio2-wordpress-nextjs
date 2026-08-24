import type {SiteId} from '@/sites'

export type HomepageRfqBehaviorField =
  | 'rfq.intro'
  | 'rfq.privacyText'
  | 'rfq.success.heading'
  | 'rfq.success.message'

export type HomepageRfqCopyContractId =
  | 'site-a-rfq-copy-v0.1'
  | 'site-b-rfq-copy-v0.1-frozen'

type HomepageRfqCopyContract = {
  readonly id: HomepageRfqCopyContractId
  readonly fields: Readonly<Record<HomepageRfqBehaviorField, readonly string[]>>
}

export const HOMEPAGE_RFQ_COPY_CONTRACTS = {
  'tio2-a': {
    id: 'site-a-rfq-copy-v0.1',
    fields: {
      'rfq.intro': ['This v0.1 local demo does not send or store inquiry data.'],
      'rfq.privacyText': ['This local demo does not send or save entered information.'],
      'rfq.success.heading': ['Local check complete'],
      'rfq.success.message': [
        'Nothing was transmitted or saved by this Site A local demo.',
      ],
    },
  },
  'tio2-b': {
    id: 'site-b-rfq-copy-v0.1-frozen',
    fields: {
      'rfq.intro': ['This v0.1 local demo does not send or store inquiry data.'],
      'rfq.privacyText': [
        'This Site B local demo does not send or save entered information.',
      ],
      'rfq.success.heading': ['Site B local check complete'],
      'rfq.success.message': [
        'No Site B information was transmitted or saved by this local demo.',
      ],
    },
  },
} as const satisfies Readonly<Record<SiteId, HomepageRfqCopyContract>>

export class HomepageRfqCopyContractError extends Error {
  readonly fieldPath: HomepageRfqBehaviorField

  constructor(fieldPath: HomepageRfqBehaviorField) {
    super(`Unsupported homepage RFQ copy for ${fieldPath}`)
    this.name = 'HomepageRfqCopyContractError'
    this.fieldPath = fieldPath
  }
}

function normalizeHomepageRfqCopy(value: string): string {
  return value.trim().replace(/\s+/gu, ' ')
}

export function validateHomepageRfqCopy(
  siteId: SiteId,
  field: HomepageRfqBehaviorField,
  value: string,
): string {
  const normalized = normalizeHomepageRfqCopy(value)
  const choices: readonly string[] = HOMEPAGE_RFQ_COPY_CONTRACTS[siteId].fields[field]
  if (!choices.includes(normalized)) {
    throw new HomepageRfqCopyContractError(field)
  }
  return normalized
}
