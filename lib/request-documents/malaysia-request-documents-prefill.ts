import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json'

export interface MalaysiaRequestDocumentsPrefillInput {
  readonly product_grade?: string | readonly string[]
  readonly application_industry?: string | readonly string[]
  readonly document_types?: string | readonly string[]
  readonly source_page_id?: string | readonly string[]
  readonly market_id?: string | readonly string[]
  readonly country_region?: string | readonly string[]
}

export interface MalaysiaRequestDocumentsPrefill {
  readonly values: Readonly<Partial<{
    product_grade: string
    application_industry: string
    document_types: readonly string[]
  }>>
  readonly sourcePageId: string | null
  readonly marketId: string | null
  readonly prefillVisible: boolean
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
const gradePageIds = contract.form.gradeOptions.map((grade) => `GRADE-${grade.replace('-', '')}`)
export const MALAYSIA_REQUEST_DOCUMENTS_SOURCE_PAGE_IDS = Object.freeze([
  'HOME-001', 'MARKET-000', 'PRODUCT-000', 'APP-000', 'DOC-000', 'RES-000',
  'PRODUCT-PROC-CL', 'PRODUCT-PROC-SU',
  'APP-COAT', 'APP-PLAS', 'APP-MB', 'APP-INK', 'APP-PAPER',
  ...gradePageIds,
] as const)
export const MALAYSIA_REQUEST_DOCUMENTS_MARKET_IDS = Object.freeze([
  'MARKET-EU-001', 'MARKET-EU-DE', 'MARKET-EU-IT', 'MARKET-EU-ES', 'MARKET-EU-PL',
  'MARKET-EU-NL', 'MARKET-EU-BE', 'MARKET-UK-001', 'MARKET-IN-001', 'MARKET-BR-EN',
] as const)
const sourcePageIds = new Set<string>(MALAYSIA_REQUEST_DOCUMENTS_SOURCE_PAGE_IDS)
const marketIds = new Set<string>(MALAYSIA_REQUEST_DOCUMENTS_MARKET_IDS)

export const normalizeMalaysiaRequestDocumentsSourcePageId = (value: unknown): string | null => (
  typeof value === 'string' && sourcePageIds.has(value) ? value : null
)
export const normalizeMalaysiaRequestDocumentsMarketId = (value: unknown): string | null => (
  typeof value === 'string' && marketIds.has(value) ? value : null
)

function safeVisibleContext(value: string | null): string | null {
  if (!value || Array.from(value).length > 160 || /[<>\u0000-\u001f\u007f]/u.test(value)) return null
  return value
}

export function resolveMalaysiaRequestDocumentsPrefill(input: MalaysiaRequestDocumentsPrefillInput): MalaysiaRequestDocumentsPrefill {
  const values: {product_grade?: string; application_industry?: string; document_types?: readonly string[]} = {}
  const grade = first(input.product_grade)
  const application = safeVisibleContext(first(input.application_industry))
  const types = [...new Set(list(input.document_types).filter((item) => documentTypes.has(item)))]
  if (grade && grades.has(grade)) values.product_grade = grade
  if (application) values.application_industry = application
  if (types.length) values.document_types = Object.freeze(types)

  const sourcePageId = normalizeMalaysiaRequestDocumentsSourcePageId(first(input.source_page_id))
  const marketId = normalizeMalaysiaRequestDocumentsMarketId(first(input.market_id))
  return {values: Object.freeze(values), sourcePageId, marketId, prefillVisible: Object.keys(values).length > 0}
}
