import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json'

export interface MalaysiaRequestDocumentsPrefillInput {
  readonly product_grade?: string | readonly string[]
  readonly application_industry?: string | readonly string[]
  readonly document_types?: string | readonly string[]
  readonly additional_requirements?: string | readonly string[]
  readonly source_page_id?: string | readonly string[]
  readonly source_page?: string | readonly string[]
  readonly market_id?: string | readonly string[]
  readonly country_region?: string | readonly string[]
}

export interface MalaysiaRequestDocumentsPrefill {
  readonly values: Readonly<Partial<{
    product_grade: string
    application_industry: string
    document_types: readonly string[]
    additional_requirements: string
  }>>
  readonly sourcePageId: string | null
  readonly marketId: string | null
  readonly prefillVisible: boolean
}

export interface MalaysiaRequestDocumentsTrustedContext {
  readonly trustedSourcePageId?: 'DOC-TDS' | 'DOC-REACH' | null
}

const first = (value: string | readonly string[] | undefined): string | null => {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' && candidate.trim() === candidate && candidate ? candidate : null
}
const list = (value: string | readonly string[] | undefined): readonly string[] => (
  Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
)
const grades = new Set<string>(contract.form.gradeOptions)
const documentTypes = new Set<string>(contract.form.documentTypes.map((item) => item.value))
const documentTypeOrder = ['technical_product', 'safety', 'quality_coa', 'regulatory', 'other'] as const
const gradePageIds = contract.form.gradeOptions.map((grade) => `GRADE-${grade.replace('-', '')}`)
const applicationContextsByGrade = new Map<string, ReadonlySet<string>>([
  ['M-350', new Set(['Coatings', 'Plastics', 'Printing Inks', 'Paper'])],
  ['M-510', new Set(['Coatings', 'Plastics', 'Masterbatch', 'Printing Inks'])],
  ['M-896', new Set(['Coatings'])], ['M-996', new Set(['Coatings'])],
  ['M-2196', new Set(['Coatings'])], ['M-895', new Set(['Coatings'])],
  ['M-200', new Set(['Plastics', 'Masterbatch'])], ['M-108', new Set(['Plastics', 'Masterbatch'])],
  ['M-210', new Set(['Plastics', 'Masterbatch'])], ['M-340', new Set(['Plastics', 'Masterbatch'])],
  ['M-886', new Set(['Plastics', 'Masterbatch'])], ['M-52', new Set(['Coatings', 'Printing Inks'])],
  ['M-2377', new Set(['Coatings', 'Plastics', 'Masterbatch', 'Printing Inks', 'Paper'])],
  ['CR-901', new Set(['Specialty Materials'])],
])
const processContextByGrade = new Map<string, string>([
  ...['M-350', 'M-510', 'M-896', 'M-895', 'M-200', 'M-210', 'M-340', 'M-886'].map((grade) => [grade, 'Chloride'] as const),
  ...['M-996', 'M-2196', 'M-108', 'M-52', 'M-2377'].map((grade) => [grade, 'Sulfate'] as const),
  ['CR-901', 'Vapor-phase oxidation'],
])
const gradeBySource = new Map<string, string>(contract.form.gradeOptions.map((grade) => [`GRADE-${grade.replace('-', '')}`, grade]))
const applicationBySource = new Map<string, string>([
  ['APP-COAT', 'Coatings'], ['APP-PLAS', 'Plastics'], ['APP-MB', 'Masterbatch'],
  ['APP-INK', 'Printing Inks'], ['APP-PAPER', 'Paper'],
])
const processBySource = new Map<string, string>([
  ['PRODUCT-PROC-CL', 'Chloride'], ['PRODUCT-PROC-SU', 'Sulfate'],
])
const approvedApplicationContexts = new Set([...applicationBySource.values(), 'Specialty Materials'])
const approvedProcessContexts = new Set(processContextByGrade.values())
const approvedVisibleContexts = new Set([...approvedApplicationContexts, ...approvedProcessContexts])
export const MALAYSIA_REQUEST_DOCUMENTS_SOURCE_PAGE_IDS = Object.freeze([
  'HOME-001', 'MARKET-000', 'MARKET-EU-001', 'PRODUCT-000', 'APP-000', 'DOC-000', 'RES-000',
  'PRODUCT-PROC-CL', 'PRODUCT-PROC-SU',
  'APP-COAT', 'APP-PLAS', 'APP-MB', 'APP-INK', 'APP-PAPER',
  'DOC-TDS', 'DOC-REACH',
  ...gradePageIds,
] as const)
export const MALAYSIA_REQUEST_DOCUMENTS_MARKET_IDS = Object.freeze([
  'MARKET-EU-001', 'MARKET-EU-DE', 'MARKET-EU-IT', 'MARKET-EU-ES', 'MARKET-EU-PL',
  'MARKET-EU-NL', 'MARKET-EU-BE', 'MARKET-UK-001', 'MARKET-IN-001', 'MARKET-BR-EN',
] as const)
const sourcePageIds = new Set<string>(MALAYSIA_REQUEST_DOCUMENTS_SOURCE_PAGE_IDS)
const marketIds = new Set<string>(MALAYSIA_REQUEST_DOCUMENTS_MARKET_IDS)

export const normalizeMalaysiaRequestDocumentsMarketId = (value: unknown): string | null => (
  typeof value === 'string' && marketIds.has(value) ? value : null
)

export function deriveMalaysiaRequestDocumentsTrustedSource(
  referer: string | null,
  requestOrigin: string,
): 'DOC-TDS' | 'DOC-REACH' | null {
  if (!referer) return null
  try {
    const source = new URL(referer)
    const origin = new URL(requestOrigin)
    if (source.origin !== origin.origin) return null
    if (source.pathname === '/documents/tds-sds-coa/') return 'DOC-TDS'
    if (source.pathname === '/documents/reach/') return 'DOC-REACH'
    return null
  } catch {
    return null
  }
}

function safeVisibleContext(value: string | null): string | null {
  if (!value || Array.from(value).length > 160 || /[<>\u0000-\u001f\u007f]/u.test(value)) return null
  return value
}

function normalizeApprovedVisibleContext(value: string | null): string | null {
  const safe = safeVisibleContext(value)
  return safe && approvedVisibleContexts.has(safe) ? safe : null
}

function relationAllowsContext(grade: string, context: string): boolean {
  return applicationContextsByGrade.get(grade)?.has(context) === true || processContextByGrade.get(grade) === context
}

interface SourceRelationContext {
  readonly productGrade?: unknown
  readonly applicationIndustry?: unknown
}

export function normalizeMalaysiaRequestDocumentsSourcePageId(
  value: unknown,
  context: SourceRelationContext = {},
): string | null {
  if (typeof value !== 'string' || !sourcePageIds.has(value)) return null
  const grade = typeof context.productGrade === 'string' && grades.has(context.productGrade) ? context.productGrade : null
  const rawVisibleContext = typeof context.applicationIndustry === 'string' && context.applicationIndustry
    ? context.applicationIndustry : null
  const visibleContext = normalizeApprovedVisibleContext(rawVisibleContext)
  if (rawVisibleContext && !visibleContext) return null
  if (grade && visibleContext && !relationAllowsContext(grade, visibleContext)) return null

  const expectedGrade = gradeBySource.get(value)
  if (expectedGrade) return grade === expectedGrade ? value : null
  const expectedApplication = applicationBySource.get(value)
  if (expectedApplication) return visibleContext === expectedApplication ? value : null
  const expectedProcess = processBySource.get(value)
  if (expectedProcess) return visibleContext === expectedProcess ? value : null
  if (value === 'PRODUCT-000' && visibleContext && !grade) return null
  if (value === 'APP-000' && visibleContext && !approvedApplicationContexts.has(visibleContext)) return null
  return value
}

export function resolveMalaysiaRequestDocumentsPrefill(
  input: MalaysiaRequestDocumentsPrefillInput,
  trusted: MalaysiaRequestDocumentsTrustedContext = {},
): MalaysiaRequestDocumentsPrefill {
  const values: {product_grade?: string; application_industry?: string; document_types?: readonly string[]; additional_requirements?: string} = {}
  let grade = Array.isArray(input.product_grade) ? null : first(input.product_grade)
  if (!grade || !grades.has(grade)) grade = null
  let application = normalizeApprovedVisibleContext(first(input.application_industry))
  if (application && grade && !relationAllowsContext(grade, application)) application = null
  const requestedSource = first(input.source_page_id) ?? first(input.source_page)
  const sourceRequiresTrustedContext = requestedSource === 'DOC-TDS' || requestedSource === 'DOC-REACH'
  let sourcePageId = sourceRequiresTrustedContext ? null : normalizeMalaysiaRequestDocumentsSourcePageId(requestedSource, {
    productGrade: grade,
    applicationIndustry: application,
  })
  const specificSource = requestedSource && (
    gradeBySource.has(requestedSource) || applicationBySource.has(requestedSource) || processBySource.has(requestedSource)
  )
  if (specificSource && !sourcePageId) {
    grade = null
    application = null
  }
  const selectedTypes = new Set(list(input.document_types).filter((item) => documentTypes.has(item)))
  const types = documentTypeOrder.filter((item) => selectedTypes.has(item))
  if (grade) values.product_grade = grade
  if (application) values.application_industry = application
  if (types.length) values.document_types = Object.freeze(types)
  const additionalRequirements = first(input.additional_requirements)
  if (additionalRequirements) values.additional_requirements = additionalRequirements

  sourcePageId = trusted.trustedSourcePageId ?? sourcePageId ?? null
  const marketId = normalizeMalaysiaRequestDocumentsMarketId(first(input.market_id))
  return {values: Object.freeze(values), sourcePageId, marketId, prefillVisible: Object.keys(values).length > 0}
}
