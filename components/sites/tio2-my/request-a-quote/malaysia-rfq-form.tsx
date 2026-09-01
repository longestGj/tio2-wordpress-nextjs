'use client'

import {useEffect, useRef, useState} from 'react'

import {emitMalaysiaRfqAnalyticsEvent} from '@/lib/rfq/malaysia-rfq-analytics'
import type {MalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import {submitMalaysiaRfq} from '@/lib/rfq/malaysia-rfq-receiver'
import {
  emptyMalaysiaRfqValues,
  type MalaysiaRfqErrors,
  type MalaysiaRfqFieldKey,
  type MalaysiaRfqValues,
  validateMalaysiaRfqValues,
} from '@/lib/rfq/malaysia-rfq-validation'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'

import styles from './malaysia-rfq-page.module.css'

type SubmissionState =
  | 'form_ready'
  | 'validation_failed'
  | 'submitting'
  | 'receipt_confirmed'
  | 'submission_unconfirmed'
  | 'service_unavailable'

interface MalaysiaRfqFormProps {
  readonly prefill: MalaysiaRfqPrefill
  readonly receiverAccessKey: string | null
  readonly privacyPolicyHref: string | null
}

const fieldLabels: Readonly<Record<MalaysiaRfqFieldKey, string>> = Object.freeze({
  grade_id: 'Product / Grade', application_id: 'Application', quantity_mt: 'Required Quantity',
  destination_country: 'Destination Country', destination_port_city: 'Destination Port / City (optional)',
  company_name: 'Company Name', contact_name: 'Your Name', business_email: 'Business Email',
  phone_whatsapp: 'Phone / WhatsApp (optional)', website: 'Website (optional)',
  additional_requirements: 'Additional Requirements (optional)',
})

function describedBy(field: MalaysiaRfqFieldKey, errors: MalaysiaRfqErrors, helper?: boolean): string | undefined {
  return [helper ? `rfq-${field}-helper` : null, errors[field] ? `rfq-${field}-error` : null]
    .filter(Boolean).join(' ') || undefined
}

export function MalaysiaRfqForm({prefill, receiverAccessKey, privacyPolicyHref}: MalaysiaRfqFormProps) {
  const [values, setValues] = useState<MalaysiaRfqValues>({...emptyMalaysiaRfqValues, ...prefill.values})
  const [errors, setErrors] = useState<MalaysiaRfqErrors>({})
  const [state, setState] = useState<SubmissionState>(receiverAccessKey ? 'form_ready' : 'service_unavailable')
  const summaryRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (state === 'validation_failed') summaryRef.current?.focus()
    if (state === 'submission_unconfirmed' || state === 'receipt_confirmed') messageRef.current?.focus()
  }, [state])

  function update(field: MalaysiaRfqFieldKey, value: string) {
    setValues((current) => ({...current, [field]: value}))
    if (errors[field]) setErrors((current) => ({...current, [field]: undefined}))
  }

  function focusField(field: MalaysiaRfqFieldKey) {
    document.getElementById(`rfq-${field}`)?.focus()
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current) return
    const validation = validateMalaysiaRfqValues(values)
    if (!validation.valid) {
      setErrors(validation.errors)
      setState('validation_failed')
      emitMalaysiaRfqAnalyticsEvent('rfq_validation_failed')
      return
    }
    pendingRef.current = true
    setErrors({})
    setState('submitting')
    emitMalaysiaRfqAnalyticsEvent('rfq_submission_started')
    const result = await submitMalaysiaRfq({...values, source_page_id: prefill.sourcePageId}, {accessKey: receiverAccessKey})
    pendingRef.current = false
    setState(result.kind)
    if (result.kind === 'receipt_confirmed') emitMalaysiaRfqAnalyticsEvent('rfq_receipt_confirmed')
    if (result.kind === 'submission_unconfirmed') emitMalaysiaRfqAnalyticsEvent('rfq_submission_unconfirmed')
  }

  if (state === 'service_unavailable') {
    return (
      <div className={styles.stateMessage} role="status" aria-live="polite">
        <h3>{contract.form.unavailable.heading}</h3>
        <p>{contract.form.unavailable.body}</p>
      </div>
    )
  }

  if (state === 'receipt_confirmed') {
    return (
      <div ref={messageRef} tabIndex={-1} className={`${styles.stateMessage} ${styles.successMessage}`} role="status" aria-live="polite">
        <h3>{contract.form.success.heading}</h3>
        <p>{contract.form.success.body}</p>
      </div>
    )
  }

  return (
    <form className={styles.form} aria-labelledby="rfq-form-heading" noValidate onSubmit={submit}>
      {state === 'validation_failed' && (
        <div ref={summaryRef} tabIndex={-1} className={styles.errorSummary} role="alert" aria-labelledby="rfq-error-summary-title">
          <h3 id="rfq-error-summary-title">{contract.form.summary.heading}</h3>
          <p>{contract.form.summary.body}</p>
          <ul>
            {Object.entries(errors).map(([field, message]) => message ? (
              <li key={field}>
                <a href={`#rfq-${field}`} onClick={(event) => {event.preventDefault(); focusField(field as MalaysiaRfqFieldKey)}}>
                  {fieldLabels[field as MalaysiaRfqFieldKey]}: {message}
                </a>
              </li>
            ) : null)}
          </ul>
        </div>
      )}

      {state === 'submission_unconfirmed' && (
        <div ref={messageRef} tabIndex={-1} className={`${styles.stateMessage} ${styles.failureMessage}`} role="alert">
          <h3>{contract.form.failure.heading}</h3>
          <p>{contract.form.failure.body}</p>
          <button type="button" className={styles.retryButton} onClick={() => setState('form_ready')}>
            {contract.form.failure.action}
          </button>
        </div>
      )}

      <fieldset disabled={state === 'submitting'}>
        <legend>{contract.form.groups[0]}</legend>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="rfq-grade_id">Product / Grade <span aria-hidden="true">*</span></label>
            <select id="rfq-grade_id" name="grade_id" required aria-required="true" aria-invalid={Boolean(errors.grade_id)} aria-describedby={describedBy('grade_id', errors)} value={values.grade_id} onChange={(event) => update('grade_id', event.target.value)}>
              <option value="">Select a product or grade</option>
              {contract.form.gradeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {errors.grade_id && <p id="rfq-grade_id-error" className={styles.fieldError}>{errors.grade_id}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="rfq-application_id">Application <span aria-hidden="true">*</span></label>
            <select id="rfq-application_id" name="application_id" required aria-required="true" aria-invalid={Boolean(errors.application_id)} aria-describedby={describedBy('application_id', errors)} value={values.application_id} onChange={(event) => update('application_id', event.target.value)}>
              <option value="">Select an application</option>
              {contract.form.applicationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
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
        <legend>{contract.form.groups[1]}</legend>
        <div className={styles.fieldGrid}>
          <TextField field="company_name" label="Company Name" required maxLength={160} values={values} errors={errors} update={update} />
          <TextField field="contact_name" label="Your Name" required maxLength={100} values={values} errors={errors} update={update} />
          <TextField field="business_email" label="Business Email" required type="email" maxLength={254} placeholder="name@company.com" helper="Use the business email where we can respond to this request." values={values} errors={errors} update={update} />
          <TextField field="phone_whatsapp" label="Phone / WhatsApp (optional)" maxLength={40} values={values} errors={errors} update={update} />
          <div className={`${styles.field} ${styles.fullField}`}>
            <TextField field="website" label="Website (optional)" type="url" maxLength={2048} placeholder="https://company.com" values={values} errors={errors} update={update} nested />
          </div>
        </div>
      </fieldset>

      <fieldset disabled={state === 'submitting'}>
        <legend>{contract.form.groups[2]}</legend>
        <div className={styles.field}>
          <label htmlFor="rfq-additional_requirements">Additional Requirements (optional)</label>
          <textarea id="rfq-additional_requirements" name="additional_requirements" maxLength={2000} rows={5} aria-invalid={Boolean(errors.additional_requirements)} aria-describedby={describedBy('additional_requirements', errors, true)} value={values.additional_requirements} onChange={(event) => update('additional_requirements', event.target.value)} />
          <p id="rfq-additional_requirements-helper" className={styles.helper}>Add any non-confidential specification, packaging, schedule, document or other context that may help us review the request.</p>
          {errors.additional_requirements && <p id="rfq-additional_requirements-error" className={styles.fieldError}>{errors.additional_requirements}</p>}
        </div>
      </fieldset>

      <div className={styles.privacyNotice}>
        <p>{contract.form.privacy.lead}</p>
        <p>{contract.form.privacy.linkLead}{' '}{privacyPolicyHref
          ? <a href={privacyPolicyHref}>{contract.form.privacy.linkLabel}</a>
          : <span className={styles.unresolvedLink}>{contract.form.privacy.linkLabel}</span>}.</p>
      </div>
      <button className={styles.submitButton} type="submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? contract.form.submittingLabel : contract.form.submitLabel}
      </button>
    </form>
  )
}

interface TextFieldProps {
  readonly field: Extract<MalaysiaRfqFieldKey, 'company_name' | 'contact_name' | 'business_email' | 'phone_whatsapp' | 'website'>
  readonly label: string
  readonly required?: boolean
  readonly type?: 'text' | 'email' | 'url'
  readonly maxLength: number
  readonly placeholder?: string
  readonly helper?: string
  readonly values: MalaysiaRfqValues
  readonly errors: MalaysiaRfqErrors
  readonly update: (field: MalaysiaRfqFieldKey, value: string) => void
  readonly nested?: boolean
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
