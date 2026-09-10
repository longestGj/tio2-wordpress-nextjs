'use client'

import {useEffect, useRef, useState} from 'react'

import {
  emptyMalaysiaContactValues,
  validateMalaysiaContactValues,
  type MalaysiaContactErrors,
  type MalaysiaContactFieldName,
  type MalaysiaContactValues,
} from '@/lib/contact/malaysia-contact-validation'
import type {MalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-types'
import styles from './malaysia-contact-page.module.css'

interface Props { readonly form: MalaysiaContactPageDto['form'] }
type State = 'ready' | 'submitting' | 'failure'

export function MalaysiaContactForm({form}: Props) {
  const [values, setValues] = useState<MalaysiaContactValues>(emptyMalaysiaContactValues)
  const [errors, setErrors] = useState<MalaysiaContactErrors>({})
  const [state, setState] = useState<State>('ready')
  const [validationAttempt, setValidationAttempt] = useState(0)
  const summaryRef = useRef<HTMLDivElement>(null)
  const failureRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef(false)

  useEffect(() => { if (validationAttempt) summaryRef.current?.focus() }, [validationAttempt])
  useEffect(() => { if (state === 'failure') failureRef.current?.focus() }, [state])

  const update = (field: MalaysiaContactFieldName, value: string) => {
    setValues((current) => ({...current, [field]: value}))
    if (errors[field]) setErrors((current) => ({...current, [field]: undefined}))
  }
  const focusField = (field: MalaysiaContactFieldName) => document.getElementById(`contact-${field}`)?.focus()

  async function sendCurrentValues() {
    if (pendingRef.current) return
    pendingRef.current = true
    setState('submitting')
    try {
      await fetch('/api/contact/submit', {
        method: 'POST',
        headers: {'content-type': 'application/json', 'x-tio2-site-scope': 'tio2-my'},
        body: JSON.stringify(values),
      })
    } catch {
      // Network and abort outcomes share the approved indeterminate failure state.
    } finally {
      pendingRef.current = false
      setState('failure')
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current) return
    const nextErrors = validateMalaysiaContactValues(values)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setState('ready')
      setValidationAttempt((current) => current + 1)
      return
    }
    setErrors({})
    await sendCurrentValues()
  }

  async function retry() {
    if (pendingRef.current) return
    const nextErrors = validateMalaysiaContactValues(values)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setState('ready')
      setValidationAttempt((current) => current + 1)
      return
    }
    await sendCurrentValues()
  }

  return (
    <form className={styles.form} aria-label="Send a general inquiry" aria-busy={state === 'submitting' || undefined} onSubmit={submit} noValidate>
      {Object.keys(errors).length > 0 ? <div ref={summaryRef} tabIndex={-1} role="alert" className={styles.errorSummary}>
        <h3>{form.summary.heading}</h3><p>{form.summary.body}</p>
        <ul>{form.fields.filter((field) => errors[field.id as MalaysiaContactFieldName]).map((field) => <li key={field.id}><a href={`#contact-${field.id}`} onClick={(event) => { event.preventDefault(); focusField(field.id as MalaysiaContactFieldName) }}>{field.label}: {errors[field.id as MalaysiaContactFieldName]}</a></li>)}</ul>
      </div> : null}

      <fieldset disabled={state === 'submitting'} className={styles.fields}><legend className={styles.srOnly}>General inquiry details</legend>
        {form.fields.map((field) => {
          const name = field.id as MalaysiaContactFieldName
          const helpId = `contact-${name}-help`
          const errorId = `contact-${name}-error`
          const describedBy = `${helpId}${errors[name] ? ` ${errorId}` : ''}`
          return <div key={name} className={`${styles.field} ${name === 'message' ? styles.wide : ''}`} data-contact-field={name}>
            <label htmlFor={`contact-${name}`}>{field.label}</label>
            {field.control === 'textarea'
              ? <textarea id={`contact-${name}`} name={name} rows={7} required aria-required="true" aria-invalid={Boolean(errors[name])} aria-describedby={describedBy} data-maxlength={field.maxLength} value={values[name]} onChange={(event) => update(name, event.target.value)} />
              : <input id={`contact-${name}`} name={name} type={field.control} required aria-required="true" aria-invalid={Boolean(errors[name])} aria-describedby={describedBy} autoComplete={field.autocomplete ?? undefined} inputMode={field.inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode'] ?? undefined} data-maxlength={field.maxLength} value={values[name]} onChange={(event) => update(name, event.target.value)} />}
            <p id={helpId} className={styles.helper}>{field.help}</p>
            <span className={styles.counter}>{Array.from(values[name]).length} / {field.maxLength}</span>
            {errors[name] ? <p id={errorId} className={styles.fieldError}>{errors[name]}</p> : null}
          </div>
        })}
      </fieldset>

      {/* The approved target includes its canonical trailing slash. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <p className={styles.privacy}>{form.privacyPrefix} <a href="/privacy-policy/">{form.privacyLinkLabel}</a> {form.privacySuffix}</p>
      <p className={styles.process}>{form.process}</p>
      <button className={styles.submit} type="submit" disabled={state === 'submitting'}>{state === 'submitting' ? form.submittingLabel : form.submitLabel}</button>
      {state === 'submitting' ? <p role="status" className={styles.srOnly}>{form.submittingLabel}</p> : null}
      {state !== 'ready' ? <EnteredValues form={form} values={values} /> : null}
      {state === 'failure' ? <div ref={failureRef} tabIndex={-1} role="alert" className={styles.failure}><h3>{form.failure.heading}</h3><p>{form.failure.body}</p><button type="button" onClick={() => void retry()}>{form.failure.action}</button></div> : null}
    </form>
  )
}

function EnteredValues({form, values}: {readonly form: MalaysiaContactPageDto['form']; readonly values: MalaysiaContactValues}) {
  return <section className={styles.readback} role="region" aria-label="Entered form values"><dl>{form.fields.map((field) => <div key={field.id}><dt>{field.label}</dt><dd>{values[field.id as MalaysiaContactFieldName]}</dd></div>)}</dl></section>
}
