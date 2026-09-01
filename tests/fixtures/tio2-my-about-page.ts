import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-page.json'
import approvedEvidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-evidence.json'

type EvidenceState = 'sufficient' | 'partial' | 'restricted'

const outputBindings: Readonly<Record<string, readonly string[]>> = {
  'hero.paragraph.1': ['organization.name', 'location.full'],
  'hero.paragraph.2': ['product.main', 'export.port', 'documents.support'],
  'hero.paragraph.3': ['product.main', 'export.port', 'documents.support'],
  'hero.paragraph.4': ['export.port', 'documents.support'],
  'hero.paragraph.5': ['supplier.intent'],
  'hero.paragraph.6': ['compliance.support'],
  'metadata.description': ['organization.name', 'location.full', 'documents.support', 'export.port'],
  'schema.organization.description.base': ['organization.name', 'location.full', 'product.main', 'documents.support', 'export.port'],
  'schema.organization.description.scale': ['scale.annual', 'scale.markets', 'scale.customers'],
}

export function aboutEvidence(state: EvidenceState = 'sufficient') {
  const evidence = structuredClone(approvedEvidence)
  const restricted = new Set<string>(state === 'sufficient' ? [] : [
    'scale.annual', 'scale.markets', 'scale.customers',
    ...(state === 'restricted' ? ['location.full'] : []),
  ])
  for (const fact of evidence.facts) {
    const dependencies = outputBindings[fact.key]
    if (restricted.has(fact.key) || dependencies?.some((key) => restricted.has(key))) {
      fact.authorization = 'restricted'
    }
  }
  evidence.evidenceState = state
  return evidence
}

export function malaysiaAboutPageSource(options: {
  scope?: string
  tamper?: boolean
  tamperEvidence?: boolean
  evidenceState?: EvidenceState
} = {}) {
  const contract = structuredClone(approvedContract)
  if (options.tamper) contract.hero.h1 = 'Tampered About page'
  const evidence = aboutEvidence(options.evidenceState)
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
