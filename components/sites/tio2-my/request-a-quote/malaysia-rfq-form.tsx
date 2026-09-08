'use client'

import {useEffect, useRef, useState, useSyncExternalStore} from 'react'

import {navigateToMalaysiaThankYou} from '@/lib/thank-you/malaysia-thank-you-session'

import styles from './malaysia-rfq-page.module.css'

type SubmissionState =
  | 'form_ready'
  | 'validation_failed'
  | 'submitting'
  | 'submission_unconfirmed'
  | 'service_unavailable'

type RfqFieldKey =
  | 'grade_id' | 'application_id' | 'quantity_mt' | 'destination_country'
  | 'destination_port_city' | 'company_name' | 'contact_name' | 'business_email'
  | 'phone_whatsapp' | 'website' | 'additional_requirements'

type RfqValues = Readonly<Record<RfqFieldKey, string>>
type RfqErrors = Partial<Record<RfqFieldKey, string>>

interface RfqFormCopy {
  readonly groups: readonly string[]
  readonly gradeOptions: readonly string[]
  readonly applicationOptions: readonly string[]
  readonly summary: {readonly heading: string; readonly body: string}
  readonly errors: Readonly<Record<string, string>>
  readonly privacy: {readonly lead: string; readonly linkLead: string; readonly linkLabel: string}
  readonly submitLabel: string
  readonly submittingLabel: string
  readonly failure: {readonly heading: string; readonly body: string; readonly action: string}
  readonly success: {readonly heading: string; readonly body: string}
  readonly unavailable: {readonly heading: string; readonly body: string}
}

interface MalaysiaRfqFormProps {
  readonly form: RfqFormCopy
  readonly receiverAvailable: boolean
  readonly privacyPolicyHref: string | null
}

const emptyValues: RfqValues = Object.freeze({
  grade_id: '', application_id: '', quantity_mt: '', destination_country: '',
  destination_port_city: '', company_name: '', contact_name: '', business_email: '',
  phone_whatsapp: '', website: '', additional_requirements: '',
})

const fieldLabels: Readonly<Record<RfqFieldKey, string>> = Object.freeze({
  grade_id: 'Product / Grade', application_id: 'Application', quantity_mt: 'Required Quantity',
  destination_country: 'Destination Country', destination_port_city: 'Destination Port / City (optional)',
  company_name: 'Company Name', contact_name: 'Your Name', business_email: 'Business Email',
  phone_whatsapp: 'Phone / WhatsApp (optional)', website: 'Website (optional)',
  additional_requirements: 'Additional Requirements (optional)',
})

const draftFields = ['grade_id', 'application_id', 'destination_country', 'additional_requirements'] as const
const emptyBrowserContext = JSON.stringify(['', null])
const subscribeToLocation = (callback: () => void) => {
  window.addEventListener('popstate', callback)
  window.addEventListener('pageshow', callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener('pageshow', callback)
  }
}
const getBrowserContext = () => JSON.stringify([
  window.location.search,
  window.history.state?.rfqDraft ?? null,
])
const getServerContext = () => emptyBrowserContext

function completeHttpUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

function validate(values: RfqValues, form: RfqFormCopy): {valid: boolean; errors: RfqErrors} {
  const errors: RfqErrors = {}
  const copy = form.errors
  const length = (value: string) => Array.from(value).length
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

  if (!form.gradeOptions.includes(grade)) errors.grade_id = copy.grade_empty
  if (!form.applicationOptions.includes(application)) errors.application_id = copy.application_empty
  if (!values.quantity_mt.trim() || !Number.isFinite(quantity) || quantity <= 0) errors.quantity_mt = copy.quantity_invalid
  if (!destination) errors.destination_country = copy.destination_empty
  else if (length(destination) > 100) errors.destination_country = copy.destination_too_long
  if (length(port) > 120) errors.destination_port_city = copy.port_too_long
  if (length(company) < 2) errors.company_name = copy.company_missing
  else if (length(company) > 160) errors.company_name = copy.company_too_long
  if (length(contact) < 2) errors.contact_name = copy.contact_missing
  else if (length(contact) > 100) errors.contact_name = copy.contact_too_long
  if (!email) errors.business_email = copy.email_empty
  else if (length(email) > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) errors.business_email = copy.email_invalid
  if (length(phone) > 40) errors.phone_whatsapp = copy.phone_too_long
  if (length(website) > 2048 || !completeHttpUrl(website)) errors.website = copy.website_invalid
  if (length(requirements) > 2000) errors.additional_requirements = copy.requirements_too_long
  return {valid: Object.keys(errors).length === 0, errors}
}

function first(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)
  return value && value.trim() === value ? value : null
}

function publicInitialValues(search: string, draft: unknown, form: RfqFormCopy): RfqValues {
  const params = new URLSearchParams(search)
  const next: Record<RfqFieldKey, string> = {...emptyValues}
  const grade = first(params, 'grade_id')
  const application = first(params, 'application_id')
  const market = first(params, 'market')
  const destination = first(params, 'destination_country')
    ?? (market === 'European Union' || market === 'United Kingdom' ? market : null)
  if (grade && form.gradeOptions.includes(grade)) next.grade_id = grade
  if (application && form.applicationOptions.includes(application) && !(grade === 'M-2377' && application === 'Specialty Materials')) {
    next.application_id = application
  }
  if (destination && Array.from(destination).length <= 100) next.destination_country = destination
  const context: string[] = []
  const process = first(params, 'process_context')
  if (grade === 'M-2377' && process === 'Sulfate') context.push(process)
  const documents = params.getAll('document_needs[]').filter((item) => ['TDS', 'SDS', 'COA', 'COO'].includes(item))
  if (documents.length) context.push([...new Set(documents)].join('; '))
  const resource = first(params, 'resource_context')
  if (resource === 'Packaging review') context.push(resource)
  if (context.length) next.additional_requirements = context.join('\n')

  if (draft && typeof draft === 'object' && !Array.isArray(draft)) {
    const record = draft as Record<string, unknown>
    for (const field of draftFields) {
      const value = record[field]
      if (typeof value === 'string' && value.length <= 2000) next[field] = value
    }
  }
  return Object.freeze(next)
}

function describedBy(field: RfqFieldKey, errors: RfqErrors, helper?: boolean): string | undefined {
  return [helper ? `rfq-${field}-helper` : null, errors[field] ? `rfq-${field}-error` : null]
    .filter(Boolean).join(' ') || undefined
}

export function MalaysiaRfqForm(props: MalaysiaRfqFormProps) {
  const context = useSyncExternalStore(subscribeToLocation, getBrowserContext, getServerContext)
  const [search, draft] = JSON.parse(context) as [string, unknown]
  return <MalaysiaRfqInteractiveForm key={context} {...props} initialValues={publicInitialValues(search, draft, props.form)} />
}

function MalaysiaRfqInteractiveForm({form, receiverAvailable, privacyPolicyHref, initialValues}: MalaysiaRfqFormProps & {readonly initialValues: RfqValues}) {
  const [values, setValues] = useState<RfqValues>(initialValues)
  const [errors, setErrors] = useState<RfqErrors>({})
  const [state, setState] = useState<SubmissionState>(receiverAvailable ? 'form_ready' : 'service_unavailable')
  const summaryRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLDivElement>(null)
  const transitionStartedRef = useRef(false)
  const completedRef = useRef(false)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (state === 'validation_failed') summaryRef.current?.focus()
    if (state === 'submission_unconfirmed') messageRef.current?.focus()
  }, [state])

  function update(field: RfqFieldKey, value: string) {
    setValues((current) => {
      const next = {...current, [field]: value}
      const draft = Object.fromEntries(draftFields.map((key) => [key, next[key]]))
      const historyState = window.history.state && typeof window.history.state === 'object'
        ? {...window.history.state}
        : {}
      window.history.replaceState({...historyState, rfqDraft: draft}, '', window.location.href)
      return next
    })
    if (errors[field]) setErrors((current) => ({...current, [field]: undefined}))
  }

  function focusField(field: RfqFieldKey) {
    document.getElementById(`rfq-${field}`)?.focus()
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current || transitionStartedRef.current) return
    if (completedRef.current) {try {navigateToMalaysiaThankYou('quote'); transitionStartedRef.current = true} catch {setState('submission_unconfirmed')} return}
    const result = validate(values, form)
    if (!result.valid) {
      setErrors(result.errors)
      setState('validation_failed')
      return
    }
    pendingRef.current = true
    setErrors({})
    setState('submitting')
    try {
      const response = await fetch('/api/rfq/submit', {
        method: 'POST',
        headers: {'content-type': 'application/json', accept: 'application/json'},
        credentials: 'same-origin',
        body: JSON.stringify(values),
      })
      if (response.status !== 200 || !response.headers.get('content-type')?.includes('application/json')) {
        setState('submission_unconfirmed')
      } else {
        const body = await response.json() as {readonly kind?: unknown}
        if (body.kind === 'receipt_confirmed') {completedRef.current = true; navigateToMalaysiaThankYou('quote'); transitionStartedRef.current = true}
        else setState(body.kind === 'service_unavailable' ? body.kind : 'submission_unconfirmed')
      }
    } catch {
      setState('submission_unconfirmed')
    } finally {
      pendingRef.current = false
    }
  }

  if (state === 'service_unavailable') {
    return <div className={styles.stateMessage} role="status" aria-live="polite"><h3>{form.unavailable.heading}</h3><p>{form.unavailable.body}</p></div>
  }

  return (
    <form className={styles.form} aria-labelledby="rfq-form-heading" noValidate onSubmit={submit}>
      {state === 'validation_failed' && (
        <div ref={summaryRef} tabIndex={-1} className={styles.errorSummary} role="alert" aria-labelledby="rfq-error-summary-title">
          <h3 id="rfq-error-summary-title">{form.summary.heading}</h3>
          <p>{form.summary.body}</p>
          <ul>{Object.entries(errors).map(([field, message]) => message ? <li key={field}><a href={`#rfq-${field}`} onClick={(event) => {event.preventDefault(); focusField(field as RfqFieldKey)}}>{fieldLabels[field as RfqFieldKey]}: {message}</a></li> : null)}</ul>
        </div>
      )}
      {state === 'submission_unconfirmed' && (
        <div ref={messageRef} tabIndex={-1} className={`${styles.stateMessage} ${styles.failureMessage}`} role="alert">
          <h3>{form.failure.heading}</h3><p>{form.failure.body}</p>
          <button type="button" className={styles.retryButton} onClick={() => setState('form_ready')}>{form.failure.action}</button>
        </div>
      )}

      <fieldset disabled={state === 'submitting'}>
        <legend>{form.groups[0]}</legend>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="rfq-grade_id">Product / Grade <span aria-hidden="true">*</span></label>
            <select id="rfq-grade_id" name="grade_id" required aria-required="true" aria-invalid={Boolean(errors.grade_id)} aria-describedby={describedBy('grade_id', errors)} value={values.grade_id} onChange={(event) => update('grade_id', event.target.value)}>
              <option value="">Select a product or grade</option>
              {form.gradeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {errors.grade_id && <p id="rfq-grade_id-error" className={styles.fieldError}>{errors.grade_id}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="rfq-application_id">Application <span aria-hidden="true">*</span></label>
            <select id="rfq-application_id" name="application_id" required aria-required="true" aria-invalid={Boolean(errors.application_id)} aria-describedby={describedBy('application_id', errors)} value={values.application_id} onChange={(event) => update('application_id', event.target.value)}>
              <option value="">Select an application</option>
              {form.applicationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {errors.application_id && <p id="rfq-application_id-error" className={styles.fieldError}>{errors.application_id}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="rfq-quantity_mt">Required Quantity <span aria-hidden="true">*</span></label>
            <div className={styles.quantityControl}>
              <input id="rfq-quantity_mt" name="quantity_mt" type="number" min="0" step="any" inputMode="decimal" placeholder="Enter quantity" required aria-required="true" aria-invalid={Boolean(errors.quantity_mt)} aria-describedby={describedBy('quantity_mt', errors)} value={values.quantity_mt} onChange={(event) => update('quantity_mt', event.target.value)} />
              <span>Metric tonnes (MT)</span>
            </div>
            {errors.quantity_mt && <p id="rfq-quantity_mt-error" className={styles.fieldError}>{errors.quantity_mt}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="rfq-destination_country">Destination Country <span aria-hidden="true">*</span></label>
            <input id="rfq-destination_country" name="destination_country" type="text" maxLength={100} placeholder="Enter the destination country" required aria-required="true" aria-invalid={Boolean(errors.destination_country)} aria-describedby={describedBy('destination_country', errors)} value={values.destination_country} onChange={(event) => update('destination_country', event.target.value)} />
            {errors.destination_country && <p id="rfq-destination_country-error" className={styles.fieldError}>{errors.destination_country}</p>}
          </div>
          <div className={`${styles.field} ${styles.fullField}`}>
            <label htmlFor="rfq-destination_port_city">Destination Port / City (optional)</label>
            <input id="rfq-destination_port_city" name="destination_port_city" type="text" maxLength={120} aria-invalid={Boolean(errors.destination_port_city)} aria-describedby={describedBy('destination_port_city', errors, true)} value={values.destination_port_city} onChange={(event) => update('destination_port_city', event.target.value)} />
            <p id="rfq-destination_port_city-helper" className={styles.helper}>Add this only if it is already known.</p>
            {errors.destination_port_city && <p id="rfq-destination_port_city-error" className={styles.fieldError}>{errors.destination_port_city}</p>}
          </div>
        </div>
      </fieldset>

      <fieldset disabled={state === 'submitting'}>
        <legend>{form.groups[1]}</legend>
        <div className={styles.fieldGrid}>
          <TextField field="company_name" label="Company Name" required maxLength={160} values={values} errors={errors} update={update} />
          <TextField field="contact_name" label="Your Name" required maxLength={100} values={values} errors={errors} update={update} />
          <TextField field="business_email" label="Business Email" required type="email" maxLength={254} placeholder="name@company.com" helper="Use the business email where we can respond to this request." values={values} errors={errors} update={update} />
          <TextField field="phone_whatsapp" label="Phone / WhatsApp (optional)" maxLength={40} values={values} errors={errors} update={update} />
          <div className={`${styles.field} ${styles.fullField}`}><TextField field="website" label="Website (optional)" type="url" maxLength={2048} placeholder="https://company.com" values={values} errors={errors} update={update} /></div>
        </div>
      </fieldset>

      <fieldset disabled={state === 'submitting'}>
        <legend>{form.groups[2]}</legend>
        <div className={styles.field}>
          <label htmlFor="rfq-additional_requirements">Additional Requirements (optional)</label>
          <textarea id="rfq-additional_requirements" name="additional_requirements" maxLength={2000} rows={5} aria-invalid={Boolean(errors.additional_requirements)} aria-describedby={describedBy('additional_requirements', errors, true)} value={values.additional_requirements} onChange={(event) => update('additional_requirements', event.target.value)} />
          <p id="rfq-additional_requirements-helper" className={styles.helper}>Add any non-confidential specification, packaging, schedule, document or other context that may help us review the request.</p>
          {errors.additional_requirements && <p id="rfq-additional_requirements-error" className={styles.fieldError}>{errors.additional_requirements}</p>}
        </div>
      </fieldset>

      <div className={styles.privacyNotice}>
        <p>{form.privacy.lead}</p>
        <p>{form.privacy.linkLead}{' '}{privacyPolicyHref ? <a href={privacyPolicyHref}>{form.privacy.linkLabel}</a> : <span className={styles.unresolvedLink}>{form.privacy.linkLabel}</span>}.</p>
      </div>
      <button className={styles.submitButton} type="submit" disabled={state === 'submitting'}>{state === 'submitting' ? form.submittingLabel : form.submitLabel}</button>
    </form>
  )
}

interface TextFieldProps {
  readonly field: Extract<RfqFieldKey, 'company_name' | 'contact_name' | 'business_email' | 'phone_whatsapp' | 'website'>
  readonly label: string
  readonly required?: boolean
  readonly type?: 'text' | 'email' | 'url'
  readonly maxLength: number
  readonly placeholder?: string
  readonly helper?: string
  readonly values: RfqValues
  readonly errors: RfqErrors
  readonly update: (field: RfqFieldKey, value: string) => void
}

function TextField({field, label, required = false, type = 'text', maxLength, placeholder, helper, values, errors, update}: TextFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={`rfq-${field}`}>{label}{required && <> <span aria-hidden="true">*</span></>}</label>
      <input id={`rfq-${field}`} name={field} type={type} maxLength={maxLength} placeholder={placeholder} required={required} aria-required={required || undefined} aria-invalid={Boolean(errors[field])} aria-describedby={describedBy(field, errors, Boolean(helper))} value={values[field]} onChange={(event) => update(field, event.target.value)} />
      {helper && <p id={`rfq-${field}-helper`} className={styles.helper}>{helper}</p>}
      {errors[field] && <p id={`rfq-${field}-error`} className={styles.fieldError}>{errors[field]}</p>}
    </div>
  )
}
