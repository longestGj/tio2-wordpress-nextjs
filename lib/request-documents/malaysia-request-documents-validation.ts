import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json'

export interface MalaysiaRequestDocumentsValues {
  readonly full_name: string
  readonly company: string
  readonly business_email: string
  readonly country_region: string
  readonly product_grade: string
  readonly document_types: readonly string[]
  readonly application_industry: string
  readonly additional_requirements: string
}

export type MalaysiaRequestDocumentsFieldKey = keyof MalaysiaRequestDocumentsValues
export type MalaysiaRequestDocumentsErrors = Partial<Record<MalaysiaRequestDocumentsFieldKey, string>>

export const emptyMalaysiaRequestDocumentsValues: MalaysiaRequestDocumentsValues = Object.freeze({
  full_name: '', company: '', business_email: '', country_region: '', product_grade: '',
  document_types: Object.freeze([]), application_industry: '', additional_requirements: '',
})

const grades = new Set<string>(contract.form.gradeOptions)
const documentTypes = new Set<string>(contract.form.documentTypes.map((item) => item.value))
const unicodeLength = (value: string) => Array.from(value).length

export function validateMalaysiaRequestDocumentsValues(values: MalaysiaRequestDocumentsValues): {
  readonly valid: boolean
  readonly errors: MalaysiaRequestDocumentsErrors
} {
  const errors: MalaysiaRequestDocumentsErrors = {}
  const e = contract.form.errors
  const fullName = values.full_name.trim()
  const company = values.company.trim()
  const email = values.business_email.trim()
  const country = values.country_region.trim()
  const grade = values.product_grade.trim()
  const selectedTypes = [...new Set(values.document_types.filter((item) => documentTypes.has(item)))]
  const requirements = values.additional_requirements.trim()

  if (!fullName) errors.full_name = e.full_name
  if (!company) errors.company = e.company
  if (!email || unicodeLength(email) > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) errors.business_email = e.business_email
  if (!country) errors.country_region = e.country_region
  if (!grades.has(grade)) errors.product_grade = e.product_grade
  if (!selectedTypes.length || selectedTypes.length !== values.document_types.length) errors.document_types = e.document_types
  if (selectedTypes.length === 1 && selectedTypes[0] === 'other' && !requirements) errors.additional_requirements = e.other_only
  else if (unicodeLength(requirements) > 500) errors.additional_requirements = e.additional_requirements_max

  return {valid: Object.keys(errors).length === 0, errors}
}

export function normalizeMalaysiaRequestDocumentsValues(values: MalaysiaRequestDocumentsValues): MalaysiaRequestDocumentsValues {
  return Object.freeze({
    full_name: values.full_name.trim(), company: values.company.trim(), business_email: values.business_email.trim(),
    country_region: values.country_region.trim(), product_grade: values.product_grade.trim(),
    document_types: Object.freeze([...new Set(values.document_types)]),
    application_industry: values.application_industry.trim(), additional_requirements: values.additional_requirements.trim(),
  })
}
