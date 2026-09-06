import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'

export interface MalaysiaSampleRequestValues {
  grade_id: string
  application_id: string
  application_other: string
  test_objective: string
  current_grade_or_target: string
  contact_name: string
  company_organisation: string
  business_email: string
  destination_country_market: string
  expected_project_annual_use: string
  documents_needed: string[]
  additional_context: string
}

export type MalaysiaSampleRequestErrors = Partial<Record<keyof MalaysiaSampleRequestValues, string>>

const grades = new Set<string>(contract.form.gradeOptions)
const applications = new Set(contract.form.applicationOptions.map(({value}) => value))
const documents = new Set(contract.form.documentOptions.map(({value}) => value))
const count = (value: string) => Array.from(value).length
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const maxMessages: Partial<Record<keyof MalaysiaSampleRequestValues, [string, number]>> = {
  application_other: ['Describe the application', 500], test_objective: ['What do you need to evaluate?', 2000],
  current_grade_or_target: ['Current grade or target requirement', 1000], contact_name: ['Contact name', 120],
  company_organisation: ['Company or organisation', 200], business_email: ['Business email', 254],
  destination_country_market: ['Destination country or market', 120], expected_project_annual_use: ['Expected project or annual use', 500],
  additional_context: ['Additional non-confidential context', 2000],
}

export function validateMalaysiaSampleRequest(values: MalaysiaSampleRequestValues): MalaysiaSampleRequestErrors {
  const errors: MalaysiaSampleRequestErrors = {}
  if (!grades.has(values.grade_id)) errors.grade_id = contract.form.errors.grade_id
  if (!applications.has(values.application_id)) errors.application_id = contract.form.errors.application_id
  if (values.application_id === 'other' && !values.application_other.trim()) errors.application_other = contract.form.errors.application_other
  if (!values.test_objective.trim()) errors.test_objective = contract.form.errors.test_objective
  if (!values.contact_name.trim()) errors.contact_name = contract.form.errors.contact_name
  if (!values.company_organisation.trim()) errors.company_organisation = contract.form.errors.company_organisation
  if (!email.test(values.business_email.trim())) errors.business_email = contract.form.errors.business_email
  if (!values.destination_country_market.trim()) errors.destination_country_market = contract.form.errors.destination_country_market
  if (values.documents_needed.some((value) => !documents.has(value))) errors.documents_needed = 'Choose only the listed documents needed for the trial.'
  for (const [key, [label, maximum]] of Object.entries(maxMessages) as [keyof MalaysiaSampleRequestValues, [string, number]][]) {
    if (key === 'application_other' && values.application_id !== 'other') continue
    const value = values[key]
    if (typeof value === 'string' && count(value) > maximum) errors[key] = `Keep ${label} to ${maximum.toLocaleString('en-US')} characters or fewer.`
  }
  return errors
}

export const emptyMalaysiaSampleRequestValues: MalaysiaSampleRequestValues = {
  grade_id: '', application_id: '', application_other: '', test_objective: '', current_grade_or_target: '',
  contact_name: '', company_organisation: '', business_email: '', destination_country_market: '',
  expected_project_annual_use: '', documents_needed: [], additional_context: '',
}
