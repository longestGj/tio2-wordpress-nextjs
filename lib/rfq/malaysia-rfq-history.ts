import type {MalaysiaRfqPrefill} from './malaysia-rfq-prefill'
import type {MalaysiaRfqValues} from './malaysia-rfq-validation'

type DraftField = 'grade_id' | 'application_id' | 'destination_country' | 'additional_requirements'

export interface MalaysiaRfqHistoryDraft {
  readonly values: Readonly<Partial<Record<DraftField, string>>>
  readonly sourcePageId: string | null
  readonly interest?: 'alternative-origin-sourcing'
}

const draftFields: readonly DraftField[] = [
  'grade_id',
  'application_id',
  'destination_country',
  'additional_requirements',
]

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() === value && value.length <= 2000 ? value : null
}

export function readMalaysiaRfqHistoryDraft(value: unknown): MalaysiaRfqHistoryDraft | null {
  if (!plainRecord(value) || !plainRecord(value.values)) return null
  const values: Partial<Record<DraftField, string>> = {}
  for (const field of draftFields) {
    const candidate = safeString(value.values[field])
    if (candidate !== null) values[field] = candidate
  }
  const sourcePageId = typeof value.sourcePageId === 'string' ? value.sourcePageId : null
  const interest = value.interest === 'alternative-origin-sourcing' ? value.interest : undefined
  return Object.freeze({
    values: Object.freeze(values),
    sourcePageId,
    ...(interest ? {interest} : {}),
  })
}

export function mergeMalaysiaRfqHistoryDraft(
  prefill: MalaysiaRfqPrefill,
  draftValue: unknown,
): MalaysiaRfqPrefill {
  const draft = readMalaysiaRfqHistoryDraft(draftValue)
  if (!draft) return prefill
  const values = Object.freeze({...prefill.values, ...draft.values})
  return Object.freeze({
    values,
    sourcePageId: prefill.sourcePageId,
    ...(prefill.interest ? {interest: prefill.interest} : {}),
  })
}

export function toMalaysiaRfqHistoryDraft(
  prefill: MalaysiaRfqPrefill,
  values: MalaysiaRfqValues,
): MalaysiaRfqHistoryDraft {
  const draftValues: Partial<Record<DraftField, string>> = {}
  for (const field of draftFields) {
    const value = values[field]
    if (value || prefill.values[field] !== undefined) draftValues[field] = value
  }
  return Object.freeze({
    values: Object.freeze(draftValues),
    sourcePageId: prefill.sourcePageId,
    ...(prefill.interest ? {interest: prefill.interest} : {}),
  })
}
