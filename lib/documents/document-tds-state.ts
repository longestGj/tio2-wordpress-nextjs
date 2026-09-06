export const DOCUMENT_TDS_TYPE_ORDER = Object.freeze([
  'technical_product',
  'safety',
  'quality_coa',
] as const)

export type DocumentTdsType = (typeof DOCUMENT_TDS_TYPE_ORDER)[number]

const labels: Readonly<Record<DocumentTdsType, string>> = {
  technical_product: 'TDS',
  safety: 'SDS',
  quality_coa: 'COA',
}

export function normalizeDocumentTdsSelection(values: readonly string[]): DocumentTdsType[] {
  const selected = new Set(values)
  return DOCUMENT_TDS_TYPE_ORDER.filter((value) => selected.has(value))
}

export function buildDocumentTdsRequestHref(values: readonly string[], grade: string): string {
  const params = new URLSearchParams()
  for (const value of normalizeDocumentTdsSelection(values)) params.append('document_types[]', value)
  if (grade) params.set('product_grade', grade)
  const query = params.toString()
  return `/request-documents/${query ? `?${query}` : ''}`
}

export function documentTdsSelectionSummary(values: readonly string[], grade: string): string {
  const types = normalizeDocumentTdsSelection(values).map((value) => labels[value])
  if (!types.length && !grade) return 'No request context selected yet.'
  if (!types.length) return `Product Grade: ${grade}`
  const selected = `Selected: ${types.join(', ')}`
  return grade ? `${selected} · Product Grade: ${grade}` : selected
}
