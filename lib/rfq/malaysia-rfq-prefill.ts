import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'

export interface MalaysiaRfqPrefillInput {
  readonly market?: string | readonly string[]
  readonly source_page?: string | readonly string[]
  readonly interest?: string | readonly string[]
  readonly grade_id?: string | readonly string[]
  readonly application_id?: string | readonly string[]
  readonly destination_country?: string | readonly string[]
  readonly market_id?: string | readonly string[]
  readonly process_context?: string | readonly string[]
  readonly document_needs?: string | readonly string[]
  readonly resource_context?: string | readonly string[]
  readonly source_page_id?: string | readonly string[]
}

export interface MalaysiaRfqPrefill {
  readonly values: Readonly<Partial<Record<'grade_id' | 'application_id' | 'destination_country' | 'additional_requirements', string>>>
  readonly sourcePageId: string | null
  readonly interest?: 'alternative-origin-sourcing'
}

const first = (value: string | readonly string[] | undefined): string | null => {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' && candidate.trim() === candidate && candidate ? candidate : null
}
const list = (value: string | readonly string[] | undefined): readonly string[] => (
  Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
)

export function resolveMalaysiaRfqPrefill(input: MalaysiaRfqPrefillInput): MalaysiaRfqPrefill {
  const values: Record<string, string> = {}
  const grade = first(input.grade_id)
  const application = first(input.application_id)
  const market = first(input.market)
  const approvedMarket = market === 'European Union' || market === 'United Kingdom' ? market : null
  const country = first(input.destination_country) ?? approvedMarket

  if (grade && contract.form.gradeOptions.includes(grade)) values.grade_id = grade
  if (
    application && contract.form.applicationOptions.includes(application) &&
    !(grade === 'M-2377' && application === 'Specialty Materials')
  ) values.application_id = application
  if (country && Array.from(country).length <= 100) values.destination_country = country

  const context: string[] = []
  const process = first(input.process_context)
  if (grade === 'M-2377' && process && contract.prefill.approvedProcessContexts.includes(process)) context.push(process)
  const documents = list(input.document_needs).filter((item) => contract.prefill.approvedDocumentLabels.includes(item))
  if (documents.length) context.push([...new Set(documents)].join('; '))
  const resource = first(input.resource_context)
  if (resource && contract.prefill.approvedResourceContexts.includes(resource)) context.push(resource)
  if (context.length) values.additional_requirements = context.join('\n')

  const source = first(input.source_page_id) ?? first(input.source_page)
  const sourcePageId = source && (
    contract.prefill.approvedSourcePageIds.includes(source) || source === 'RES-ORIGIN'
  ) ? source : null
  const interest = sourcePageId === 'RES-ORIGIN' && first(input.interest) === 'alternative-origin-sourcing'
    ? 'alternative-origin-sourcing' as const
    : null
  return {
    values: Object.freeze(values),
    sourcePageId,
    ...(interest ? {interest} : {}),
  }
}
