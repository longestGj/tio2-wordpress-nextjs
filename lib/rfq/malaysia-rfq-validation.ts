import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'

export interface MalaysiaRfqValues {
  readonly grade_id: string
  readonly application_id: string
  readonly quantity_mt: string
  readonly destination_country: string
  readonly destination_port_city: string
  readonly company_name: string
  readonly contact_name: string
  readonly business_email: string
  readonly phone_whatsapp: string
  readonly website: string
  readonly additional_requirements: string
}

export type MalaysiaRfqFieldKey = keyof MalaysiaRfqValues
export type MalaysiaRfqErrors = Partial<Record<MalaysiaRfqFieldKey, string>>

export interface MalaysiaRfqValidationResult {
  readonly valid: boolean
  readonly errors: MalaysiaRfqErrors
}

export const emptyMalaysiaRfqValues: MalaysiaRfqValues = Object.freeze({
  grade_id: '', application_id: '', quantity_mt: '', destination_country: '',
  destination_port_city: '', company_name: '', contact_name: '', business_email: '',
  phone_whatsapp: '', website: '', additional_requirements: '',
})

const grades = new Set<string>(contract.form.gradeOptions)
const applications = new Set<string>(contract.form.applicationOptions)
const unicodeLength = (value: string) => Array.from(value).length

function completeHttpUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

export function validateMalaysiaRfqValues(values: MalaysiaRfqValues): MalaysiaRfqValidationResult {
  const errors: MalaysiaRfqErrors = {}
  const e = contract.form.errors
  const grade = values.grade_id.trim()
  const application = values.application_id.trim()
  const quantity = Number(values.quantity_mt)
  const destination = values.destination_country.trim()
  const port = values.destination_port_city.trim()
  const company = values.company_name.trim()
  const contact = values.contact_name.trim()
  const email = values.business_email.trim()
  const phone = values.phone_whatsapp.trim()
  const website = values.website.trim()
  const requirements = values.additional_requirements.trim()

  if (!grades.has(grade)) errors.grade_id = e.grade_empty
  if (!applications.has(application)) errors.application_id = e.application_empty
  if (!values.quantity_mt.trim() || !Number.isFinite(quantity) || quantity <= 0) errors.quantity_mt = e.quantity_invalid
  if (!destination) errors.destination_country = e.destination_empty
  else if (unicodeLength(destination) > 100) errors.destination_country = e.destination_too_long
  if (unicodeLength(port) > 120) errors.destination_port_city = e.port_too_long
  if (unicodeLength(company) < 2) errors.company_name = e.company_missing
  else if (unicodeLength(company) > 160) errors.company_name = e.company_too_long
  if (unicodeLength(contact) < 2) errors.contact_name = e.contact_missing
  else if (unicodeLength(contact) > 100) errors.contact_name = e.contact_too_long
  if (!email) errors.business_email = e.email_empty
  else if (unicodeLength(email) > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) errors.business_email = e.email_invalid
  if (unicodeLength(phone) > 40) errors.phone_whatsapp = e.phone_too_long
  if (unicodeLength(website) > 2048 || !completeHttpUrl(website)) errors.website = e.website_invalid
  if (unicodeLength(requirements) > 2000) errors.additional_requirements = e.requirements_too_long

  return {valid: Object.keys(errors).length === 0, errors}
}
