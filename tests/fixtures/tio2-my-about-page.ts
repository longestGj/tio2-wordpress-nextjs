import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-page.json'
import approvedEvidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-evidence.json'

type EvidenceState = 'sufficient' | 'partial' | 'restricted'
export type EvidenceAuthorization = 'user_approved_public' | 'restricted' | 'not_public'

export function aboutEvidence(
  state: EvidenceState = 'sufficient',
  authorizations?: Readonly<Record<string, EvidenceAuthorization>>,
) {
  const evidence = structuredClone(approvedEvidence)
  const defaults = state === 'sufficient' ? {} : Object.fromEntries([
    'scale.annual', 'scale.markets', 'scale.customers',
    ...(state === 'restricted' ? ['location.full'] : []),
  ].map((key) => [key, 'restricted']))
  const statuses = authorizations ?? defaults
  for (const fact of evidence.facts) {
    fact.authorization = statuses[fact.key] ?? 'user_approved_public'
  }
  evidence.evidenceState = state
  return evidence
}

export function malaysiaAboutPageSource(options: {
  scope?: string
  tamper?: boolean
  tamperEvidence?: boolean
  evidenceState?: EvidenceState
  authorizations?: Readonly<Record<string, EvidenceAuthorization>>
} = {}) {
  const contract = structuredClone(approvedContract)
  if (options.tamper) contract.hero.h1 = 'Tampered About page'
  const evidence = aboutEvidence(options.evidenceState, options.authorizations)
  if (options.tamperEvidence) evidence.facts[0]!.value = 'Tampered organization'
  return {
    id: 'about-page-901',
    modifiedGmt: '2026-09-01T08:30:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: options.scope ?? 'tio2-my'}]},
    publishingFields: {publicPath: '/about'},
    malaysiaAboutPageContractJson: JSON.stringify(contract),
    malaysiaAboutPageEvidenceJson: JSON.stringify(evidence),
  }
}
