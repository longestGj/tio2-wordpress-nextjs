'use client'

import {useEffect, useMemo, useRef, useState} from 'react'

import {
  normalizeMalaysiaRequestDocumentsMarketId,
  normalizeMalaysiaRequestDocumentsSourcePageId,
  type MalaysiaRequestDocumentsPrefill,
} from '@/lib/request-documents/malaysia-request-documents-prefill'
import {submitMalaysiaRequestDocuments} from '@/lib/request-documents/malaysia-request-documents-receiver'
import {
  emptyMalaysiaRequestDocumentsValues,
  validateMalaysiaRequestDocumentsValues,
  type MalaysiaRequestDocumentsErrors,
  type MalaysiaRequestDocumentsFieldKey,
  type MalaysiaRequestDocumentsValues,
} from '@/lib/request-documents/malaysia-request-documents-validation'
import type {MalaysiaRequestDocumentsPageDto} from '@/lib/wordpress/request-documents-v01-types'

import styles from './malaysia-request-documents-page.module.css'

interface Props {
  readonly page: MalaysiaRequestDocumentsPageDto
  readonly prefill: MalaysiaRequestDocumentsPrefill
}

type SubmissionState = 'ready' | 'submitting' | 'failure' | 'success'

const labels: Record<MalaysiaRequestDocumentsFieldKey, string> = {
  full_name: 'Full Name', company: 'Company', business_email: 'Business Email',
  country_region: 'Country / Region', product_grade: 'Product Grade',
  document_types: 'Document Types', application_industry: 'Application / Industry',
  additional_requirements: 'Additional Requirements',
}

export function createSecureRequestToken(cryptoApi: Crypto | undefined = globalThis.crypto): string {
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  if (!cryptoApi?.getRandomValues) throw new Error('A secure UUID generator is required')
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function MalaysiaRequestDocumentsForm({page, prefill}: Props) {
  const [values, setValues] = useState<MalaysiaRequestDocumentsValues>({
    ...emptyMalaysiaRequestDocumentsValues,
    ...prefill.values,
    document_types: prefill.values.document_types ?? [],
  })
  const [errors, setErrors] = useState<MalaysiaRequestDocumentsErrors>({})
  const [state, setState] = useState<SubmissionState>('ready')
  const [validationAttempt, setValidationAttempt] = useState(0)
  const summaryRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<HTMLDivElement>(null)
  const requestTokenRef = useRef<string | null>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (validationAttempt > 0) summaryRef.current?.focus()
  }, [validationAttempt])

  useEffect(() => {
    if (state === 'failure' || state === 'success') stateRef.current?.focus()
  }, [state])

  const reviewRows = useMemo(() => {
    const rows: Array<[string, string]> = []
    if (values.full_name.trim()) rows.push(['Full Name', values.full_name.trim()])
    if (values.company.trim()) rows.push(['Company', values.company.trim()])
    if (values.business_email.trim()) rows.push(['Business Email', values.business_email.trim()])
    if (values.country_region.trim()) rows.push(['Country / Region', values.country_region.trim()])
    if (values.product_grade) rows.push(['Product Grade', values.product_grade])
    if (values.document_types.length) rows.push(['Document Types', values.document_types.map((value) => page.form.documentTypes.find((item) => item.value === value)?.label ?? value).join(', ')])
    if (values.application_industry.trim()) rows.push(['Application / Industry', values.application_industry.trim()])
    if (values.additional_requirements.trim()) rows.push(['Additional Requirements', values.additional_requirements.trim()])
    return rows
  }, [page.form.documentTypes, values])

  const update = (field: Exclude<MalaysiaRequestDocumentsFieldKey, 'document_types'>, value: string) => {
    requestTokenRef.current = null
    setValues((current) => ({...current, [field]: value}))
    if (errors[field]) setErrors((current) => ({...current, [field]: undefined}))
  }
  const toggleDocumentType = (value: string) => {
    requestTokenRef.current = null
    setValues((current) => ({
      ...current,
      document_types: current.document_types.includes(value)
        ? current.document_types.filter((item) => item !== value)
        : [...current.document_types, value],
    }))
    if (errors.document_types || errors.additional_requirements) {
      setErrors((current) => ({...current, document_types: undefined, additional_requirements: undefined}))
    }
  }
  const focusField = (field: MalaysiaRequestDocumentsFieldKey) => {
    if (field === 'document_types') {
      document.querySelector<HTMLInputElement>('#request-documents-document_types input[type="checkbox"]')?.focus()
      return
    }
    document.getElementById(`request-documents-${field}`)?.focus()
  }

  async function performSubmission() {
    if (pendingRef.current) return
    setErrors({})
    setState('submitting')
    pendingRef.current = true
    try {
      requestTokenRef.current ??= createSecureRequestToken()
      const result = await submitMalaysiaRequestDocuments(values, {
        accessKey: process.env.NEXT_PUBLIC_TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY ?? null,
        requestToken: requestTokenRef.current,
        sourcePageId: normalizeMalaysiaRequestDocumentsSourcePageId(prefill.sourcePageId, {
          productGrade: values.product_grade,
          applicationIndustry: values.application_industry,
        }),
        marketId: normalizeMalaysiaRequestDocumentsMarketId(prefill.marketId),
      })
      if (result.kind === 'receipt_confirmed') {
        setState('success')
      } else if (result.kind === 'validation_failed' && Object.keys(result.errors).length) {
        setErrors(result.errors)
        setState('ready')
        setValidationAttempt((current) => current + 1)
        return
      } else {
        setState('failure')
      }
    } catch {
      setState('failure')
    } finally {
      pendingRef.current = false
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current) return
    const validation = validateMalaysiaRequestDocumentsValues(values)
    if (!validation.valid) {
      setErrors(validation.errors)
      setState('ready')
      setValidationAttempt((current) => current + 1)
      return
    }
    await performSubmission()
  }

  const describedBy = (field: MalaysiaRequestDocumentsFieldKey, helper?: boolean) => [
    helper ? `request-documents-${field}-helper` : null,
    errors[field] ? `request-documents-${field}-error` : null,
  ].filter(Boolean).join(' ') || undefined

  return (
    <form className={styles.form} aria-label="Request Documents" onSubmit={submit} noValidate>
      {prefill.prefillVisible && (
        <section className={styles.prefillReview} aria-labelledby="request-documents-prefill-heading" data-module="prefill-review">
          <h2 id="request-documents-prefill-heading">{page.prefill.heading}</h2>
          <p>{page.prefill.body}</p>
          <ul>
            {prefill.values.product_grade && <li><strong>Product Grade</strong><span>{prefill.values.product_grade}</span></li>}
            {prefill.values.document_types?.map((value) => {
              const option = page.form.documentTypes.find((item) => item.value === value)
              return option ? <li key={value}><strong>Document Type</strong><span>{option.label}</span></li> : null
            })}
            {prefill.values.application_industry && <li><strong>Application / Industry</strong><span>{prefill.values.application_industry}</span></li>}
          </ul>
        </section>
      )}

      {Object.keys(errors).length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className={styles.errorSummary} role="alert">
          <h2>{page.form.errors.summary}</h2>
          <ul>{Object.entries(errors).map(([field, message]) => message ? (
            <li key={field}><a href={`#request-documents-${field}`} onClick={(event) => { event.preventDefault(); focusField(field as MalaysiaRequestDocumentsFieldKey) }}>{labels[field as MalaysiaRequestDocumentsFieldKey]}: {message}</a></li>
          ) : null)}</ul>
        </div>
      )}

      <fieldset disabled={state === 'submitting' || state === 'success'}>
        <legend><span><span aria-hidden="true">1. </span>Your Details</span><small><span aria-hidden="true">*</span> Required</small></legend>
        <div className={styles.fieldGrid}>
          <Field field="full_name" label="Full Name" required autoComplete="name" values={values} errors={errors} update={update} />
          <Field field="company" label="Company" required autoComplete="organization" values={values} errors={errors} update={update} />
          <Field field="business_email" label="Business Email" type="email" required autoComplete="email" helper="Use the business email where our team can follow up." values={values} errors={errors} update={update} />
          <Field field="country_region" label="Country / Region" required autoComplete="country-name" placeholder="Enter your country or region" helper="Enter the country or region where your company is based." values={values} errors={errors} update={update} />
        </div>
      </fieldset>

      <fieldset disabled={state === 'submitting' || state === 'success'}>
        <legend><span><span aria-hidden="true">2. </span>Request Details</span><small>Choose one Grade and one or more types</small></legend>
        <div className={styles.fieldGrid}>
          <div className={styles.field} data-request-documents-field="product_grade">
            <label htmlFor="request-documents-product_grade">Product Grade <span aria-hidden="true">*</span></label>
            <select id="request-documents-product_grade" name="product_grade" required aria-required="true" aria-invalid={Boolean(errors.product_grade)} aria-describedby={describedBy('product_grade')} value={values.product_grade} onChange={(event) => update('product_grade', event.target.value)}>
              <option value="">Select a Product Grade</option>
              {page.form.gradeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {errors.product_grade && <p id="request-documents-product_grade-error" className={styles.fieldError}>{errors.product_grade}</p>}
          </div>
          <Field field="application_industry" label="Application / Industry (optional)" helper="Add context to help the reviewer understand your request." values={values} errors={errors} update={update} />
        </div>

        <fieldset id="request-documents-document_types" className={styles.documentTypes} data-request-documents-field="document_types" aria-invalid={Boolean(errors.document_types)} aria-describedby={describedBy('document_types')}>
          <legend>Document Types <span aria-hidden="true">*</span></legend>
          <p className={styles.helper}>Select at least one request type.</p>
          <div className={styles.documentTypeGrid}>
            {page.form.documentTypes.map((option) => (
              <label key={option.value} className={values.document_types.includes(option.value) ? styles.documentTypeSelected : undefined}>
                <input type="checkbox" name="document_types" value={option.value} checked={values.document_types.includes(option.value)} onChange={() => toggleDocumentType(option.value)} />
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
              </label>
            ))}
          </div>
          {errors.document_types && <p id="request-documents-document_types-error" className={styles.fieldError}>{errors.document_types}</p>}
        </fieldset>

        <div className={`${styles.field} ${styles.notes}`} data-request-documents-field="additional_requirements">
          <label htmlFor="request-documents-additional_requirements">Additional Requirements{values.document_types.length === 1 && values.document_types[0] === 'other' && <> <span aria-hidden="true">*</span></>}</label>
          <textarea id="request-documents-additional_requirements" name="additional_requirements" rows={5} required={values.document_types.length === 1 && values.document_types[0] === 'other'} aria-required={values.document_types.length === 1 && values.document_types[0] === 'other'} aria-invalid={Boolean(errors.additional_requirements)} aria-describedby={describedBy('additional_requirements', true)} value={values.additional_requirements} onChange={(event) => update('additional_requirements', event.target.value)} />
          <p id="request-documents-additional_requirements-helper" className={styles.helper}>Required when Other Documentation is your only selection. Otherwise optional. Do not include confidential information.</p>
          <span className={styles.counter}>{Array.from(values.additional_requirements).length} / 500</span>
          {errors.additional_requirements && <p id="request-documents-additional_requirements-error" className={styles.fieldError}>{errors.additional_requirements}</p>}
        </div>
      </fieldset>

      <section className={styles.review} aria-labelledby="request-documents-review-heading">
        <div className={styles.reviewHeading}><h2 id="request-documents-review-heading"><span aria-hidden="true">3. </span>{page.form.reviewHeading}</h2><small>Check the information below</small></div>
        <dl>{reviewRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>

      <div className={styles.submitRow}>
        <p className={styles.privacy}>{page.form.privacyNotice.replace('Privacy Policy.', '')}<a href={page.form.privacyHref}>Privacy Policy</a>.</p>
        <div>
          <button className={styles.submit} type="submit" disabled={state === 'submitting' || state === 'success'}>{state === 'submitting' ? page.form.submittingLabel : page.form.submitLabel}</button>
          {state === 'submitting' && <p className={styles.submitting} role="status">{page.form.submittingHelper}</p>}
        </div>
      </div>

      {state === 'failure' && (
        <div ref={stateRef} tabIndex={-1} className={styles.failure} role="alert">
          <h2>{page.form.failure.heading}</h2><p>{page.form.failure.body}</p>
          <button type="button" onClick={() => void performSubmission()}>{page.form.failure.action}</button>
        </div>
      )}
      {state === 'success' && (
        <div ref={stateRef} tabIndex={-1} className={styles.success} role="status">
          <h2>{page.form.success.heading}</h2><p>{page.form.success.body}</p><p>{page.form.success.boundary}</p>
          <a href={page.form.success.action.href}>{page.form.success.action.label}</a>
        </div>
      )}
    </form>
  )
}

interface FieldProps {
  readonly field: Exclude<MalaysiaRequestDocumentsFieldKey, 'document_types' | 'product_grade' | 'additional_requirements'>
  readonly label: string
  readonly required?: boolean
  readonly type?: 'text' | 'email'
  readonly autoComplete?: string
  readonly placeholder?: string
  readonly helper?: string
  readonly values: MalaysiaRequestDocumentsValues
  readonly errors: MalaysiaRequestDocumentsErrors
  readonly update: (field: Exclude<MalaysiaRequestDocumentsFieldKey, 'document_types'>, value: string) => void
}

function Field({field, label, required = false, type = 'text', autoComplete, placeholder, helper, values, errors, update}: FieldProps) {
  const describedBy = [helper ? `request-documents-${field}-helper` : null, errors[field] ? `request-documents-${field}-error` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={styles.field} data-request-documents-field={field}>
      <label htmlFor={`request-documents-${field}`}>{label}{required && <> <span aria-hidden="true">*</span></>}</label>
      <input id={`request-documents-${field}`} name={field} type={type} required={required} aria-required={required || undefined} aria-invalid={Boolean(errors[field])} aria-describedby={[describedBy, field === 'business_email' && /@(gmail|yahoo|hotmail|outlook)\./iu.test(values.business_email) ? `request-documents-${field}-advice` : null].filter(Boolean).join(' ') || undefined} autoComplete={autoComplete} placeholder={placeholder} value={values[field]} onChange={(event) => update(field, event.target.value)} />
      {helper && <p id={`request-documents-${field}-helper`} className={styles.helper}>{helper}</p>}
      {field === 'business_email' && /@(gmail|yahoo|hotmail|outlook)\./iu.test(values.business_email) && <p id={`request-documents-${field}-advice`} className={styles.advice}>{pageEmailAdvice}</p>}
      {errors[field] && <p id={`request-documents-${field}-error`} className={styles.fieldError}>{errors[field]}</p>}
    </div>
  )
}

const pageEmailAdvice = 'If possible, use your company email to help us verify the business context. You can still continue.'
