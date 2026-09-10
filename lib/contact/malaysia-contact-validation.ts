import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-contact-page.json'

export const malaysiaContactFieldNames = [
  'full_name', 'company', 'business_email', 'country_region', 'subject', 'message',
] as const

export type MalaysiaContactFieldName = typeof malaysiaContactFieldNames[number]
export type MalaysiaContactValues = Readonly<Record<MalaysiaContactFieldName, string>>
export type MalaysiaContactErrors = Partial<Record<MalaysiaContactFieldName, string>>

export const emptyMalaysiaContactValues: MalaysiaContactValues = {
  full_name: '', company: '', business_email: '', country_region: '', subject: '', message: '',
}

const maximums: Readonly<Record<MalaysiaContactFieldName, number>> = {
  full_name: 100, company: 160, business_email: 254, country_region: 100, subject: 120, message: 2000,
}

const emptyMessages: Readonly<Record<MalaysiaContactFieldName, string>> = {
  full_name: contract.form.errors.full_name_empty,
  company: contract.form.errors.company_empty,
  business_email: contract.form.errors.business_email_empty,
  country_region: contract.form.errors.country_region_empty,
  subject: contract.form.errors.subject_empty,
  message: contract.form.errors.message_empty,
}

const longMessages: Readonly<Record<MalaysiaContactFieldName, string>> = {
  full_name: contract.form.errors.full_name_long,
  company: contract.form.errors.company_long,
  business_email: contract.form.errors.business_email_long,
  country_region: contract.form.errors.country_region_long,
  subject: contract.form.errors.subject_long,
  message: contract.form.errors.message_long,
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

export function validateMalaysiaContactValues(values: MalaysiaContactValues): MalaysiaContactErrors {
  const errors: MalaysiaContactErrors = {}
  for (const field of malaysiaContactFieldNames) {
    const trimmed = values[field].trim()
    if (!trimmed) errors[field] = emptyMessages[field]
    else if (Array.from(trimmed).length > maximums[field]) errors[field] = longMessages[field]
  }
  const email = values.business_email.trim()
  if (email && Array.from(email).length <= maximums.business_email && !emailPattern.test(email)) {
    errors.business_email = contract.form.errors.business_email_invalid
  }
  return errors
}

export function normalizeMalaysiaContactValues(values: MalaysiaContactValues): MalaysiaContactValues {
  return Object.fromEntries(
    malaysiaContactFieldNames.map((field) => [field, values[field].trim()]),
  ) as unknown as MalaysiaContactValues
}

export function isExactMalaysiaContactPayload(value: unknown): value is MalaysiaContactValues {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value).sort()
  const expected = [...malaysiaContactFieldNames].sort()
  return keys.length === expected.length
    && keys.every((key, index) => key === expected[index])
    && malaysiaContactFieldNames.every((field) => typeof (value as Record<string, unknown>)[field] === 'string')
}
