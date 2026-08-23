'use client'

import {useEffect, useRef, useState} from 'react'

import type {HomepageRfqDto} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'

interface RfqFormProps {
  readonly rfq: HomepageRfqDto
}

interface FormValues {
  readonly name: string
  readonly company: string
  readonly countryRegion: string
  readonly workEmail: string
  readonly buyerType: '' | 'industrial' | 'distributor' | 'other'
  readonly interest: string
  readonly expectedQuantity: string
  readonly destination: string
  readonly message: string
  readonly privacy: boolean
}

type TextFieldName = Exclude<keyof FormValues, 'privacy'>
type FieldName = keyof FormValues
type FieldErrors = Partial<Record<FieldName, string>>

const INITIAL_VALUES: FormValues = {
  name: '',
  company: '',
  countryRegion: '',
  workEmail: '',
  buyerType: '',
  interest: '',
  expectedQuantity: '',
  destination: '',
  message: '',
  privacy: false,
}

const MAX_LENGTHS = {
  name: 80,
  company: 120,
  countryRegion: 80,
  workEmail: 254,
  interest: 160,
  expectedQuantity: 80,
  destination: 120,
  message: 1200,
} as const satisfies Readonly<
  Record<Exclude<TextFieldName, 'buyerType'>, number>
>

const REQUIRED_FIELDS: readonly FieldName[] = [
  'name',
  'company',
  'countryRegion',
  'workEmail',
  'buyerType',
  'interest',
  'message',
  'privacy',
]

const FIELD_ORDER: readonly FieldName[] = [
  'name',
  'company',
  'countryRegion',
  'workEmail',
  'buyerType',
  'interest',
  'expectedQuantity',
  'destination',
  'message',
  'privacy',
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

function validate(values: FormValues, rfq: HomepageRfqDto): FieldErrors {
  const errors: FieldErrors = {}

  for (const field of REQUIRED_FIELDS) {
    const value = values[field]
    if (typeof value === 'boolean' ? !value : !value.trim()) {
      errors[field] = `${rfq.labels[field]} is required.`
    }
  }

  for (const [field, limit] of Object.entries(MAX_LENGTHS) as Array<
    [keyof typeof MAX_LENGTHS, number]
  >) {
    if (values[field].trim().length > limit) {
      errors[field] = `${rfq.labels[field]} must be ${limit} characters or fewer.`
    }
  }

  if (
    values.workEmail.trim() &&
    !EMAIL_PATTERN.test(values.workEmail.trim()) &&
    !errors.workEmail
  ) {
    errors.workEmail = `${rfq.labels.workEmail} must be a valid email address.`
  }

  return errors
}

export function RfqForm({rfq}: RfqFormProps) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submittedLocally, setSubmittedLocally] = useState(false)
  const controls = useRef<Partial<Record<FieldName, HTMLElement>>>({})

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => setIsHydrated(true), 0)
    return () => window.clearTimeout(hydrationTimer)
  }, [])

  function updateText(field: TextFieldName, value: string) {
    setValues((current) => ({...current, [field]: value}))
    setSubmittedLocally(false)
  }

  function errorId(field: FieldName) {
    return errors[field] ? `rfq-${field}-error` : undefined
  }

  function renderError(field: FieldName) {
    return errors[field] ? (
      <p className={styles.fieldError} id={`rfq-${field}-error`}>
        {errors[field]}
      </p>
    ) : null
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values, rfq)
    setErrors(nextErrors)

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field])
    if (firstInvalid) {
      setSubmittedLocally(false)
      controls.current[firstInvalid]?.focus()
      return
    }

    setValues(INITIAL_VALUES)
    setSubmittedLocally(true)
  }

  return (
    <div className={styles.rfqFormPanel}>
      {Object.keys(errors).length > 0 ? (
        <div className={styles.errorSummary} role="alert" tabIndex={-1}>
          <p>Please review the highlighted fields.</p>
          <ul>
            {FIELD_ORDER.flatMap((field) =>
              errors[field] ? <li key={field}>{errors[field]}</li> : [],
            )}
          </ul>
        </div>
      ) : null}

      {submittedLocally ? (
        <div className={styles.successStatus} role="status">
          <h3>{rfq.success.heading}</h3>
          <p>{rfq.success.message}</p>
        </div>
      ) : null}

      <form className={styles.rfqForm} noValidate onSubmit={handleSubmit}>
        <fieldset className={styles.rfqFormFields} disabled={!isHydrated}>
          <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="rfq-name">{rfq.labels.name}</label>
            <input
              id="rfq-name"
              name="name"
              autoComplete="name"
              maxLength={MAX_LENGTHS.name}
              required
              value={values.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errorId('name')}
              ref={(node) => {
                controls.current.name = node ?? undefined
              }}
              onChange={(event) => updateText('name', event.target.value)}
            />
            {renderError('name')}
          </div>

          <div className={styles.field}>
            <label htmlFor="rfq-company">{rfq.labels.company}</label>
            <input
              id="rfq-company"
              name="company"
              autoComplete="organization"
              maxLength={MAX_LENGTHS.company}
              required
              value={values.company}
              aria-invalid={Boolean(errors.company)}
              aria-describedby={errorId('company')}
              ref={(node) => {
                controls.current.company = node ?? undefined
              }}
              onChange={(event) => updateText('company', event.target.value)}
            />
            {renderError('company')}
          </div>

          <div className={styles.field}>
            <label htmlFor="rfq-country-region">{rfq.labels.countryRegion}</label>
            <input
              id="rfq-country-region"
              name="countryRegion"
              autoComplete="country-name"
              maxLength={MAX_LENGTHS.countryRegion}
              required
              value={values.countryRegion}
              aria-invalid={Boolean(errors.countryRegion)}
              aria-describedby={errorId('countryRegion')}
              ref={(node) => {
                controls.current.countryRegion = node ?? undefined
              }}
              onChange={(event) =>
                updateText('countryRegion', event.target.value)
              }
            />
            {renderError('countryRegion')}
          </div>

          <div className={styles.field}>
            <label htmlFor="rfq-work-email">{rfq.labels.workEmail}</label>
            <input
              id="rfq-work-email"
              name="workEmail"
              type="email"
              autoComplete="email"
              maxLength={MAX_LENGTHS.workEmail}
              required
              value={values.workEmail}
              aria-invalid={Boolean(errors.workEmail)}
              aria-describedby={errorId('workEmail')}
              ref={(node) => {
                controls.current.workEmail = node ?? undefined
              }}
              onChange={(event) => updateText('workEmail', event.target.value)}
            />
            {renderError('workEmail')}
          </div>

          <div className={styles.field}>
            <label htmlFor="rfq-buyer-type">{rfq.labels.buyerType}</label>
            <select
              id="rfq-buyer-type"
              name="buyerType"
              required
              value={values.buyerType}
              aria-invalid={Boolean(errors.buyerType)}
              aria-describedby={errorId('buyerType')}
              ref={(node) => {
                controls.current.buyerType = node ?? undefined
              }}
              onChange={(event) =>
                updateText('buyerType', event.target.value)
              }
            >
              <option value="">—</option>
              <option value="industrial">{rfq.labels.buyerIndustrial}</option>
              <option value="distributor">{rfq.labels.buyerDistributor}</option>
              <option value="other">{rfq.labels.buyerOther}</option>
            </select>
            {renderError('buyerType')}
          </div>

          <div className={styles.field}>
            <label htmlFor="rfq-interest">{rfq.labels.interest}</label>
            <input
              id="rfq-interest"
              name="interest"
              autoComplete="off"
              maxLength={MAX_LENGTHS.interest}
              required
              value={values.interest}
              aria-invalid={Boolean(errors.interest)}
              aria-describedby={errorId('interest')}
              ref={(node) => {
                controls.current.interest = node ?? undefined
              }}
              onChange={(event) => updateText('interest', event.target.value)}
            />
            {renderError('interest')}
          </div>

          <div className={styles.field}>
            <label htmlFor="rfq-expected-quantity">
              {rfq.labels.expectedQuantity}
            </label>
            <input
              id="rfq-expected-quantity"
              name="expectedQuantity"
              autoComplete="off"
              maxLength={MAX_LENGTHS.expectedQuantity}
              value={values.expectedQuantity}
              aria-invalid={Boolean(errors.expectedQuantity)}
              aria-describedby={errorId('expectedQuantity')}
              ref={(node) => {
                controls.current.expectedQuantity = node ?? undefined
              }}
              onChange={(event) =>
                updateText('expectedQuantity', event.target.value)
              }
            />
            {renderError('expectedQuantity')}
          </div>

          <div className={styles.field}>
            <label htmlFor="rfq-destination">{rfq.labels.destination}</label>
            <input
              id="rfq-destination"
              name="destination"
              autoComplete="shipping country-name"
              maxLength={MAX_LENGTHS.destination}
              value={values.destination}
              aria-invalid={Boolean(errors.destination)}
              aria-describedby={errorId('destination')}
              ref={(node) => {
                controls.current.destination = node ?? undefined
              }}
              onChange={(event) => updateText('destination', event.target.value)}
            />
            {renderError('destination')}
          </div>

          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label htmlFor="rfq-message">{rfq.labels.message}</label>
            <textarea
              id="rfq-message"
              name="message"
              autoComplete="off"
              maxLength={MAX_LENGTHS.message}
              required
              rows={6}
              value={values.message}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errorId('message')}
              ref={(node) => {
                controls.current.message = node ?? undefined
              }}
              onChange={(event) => updateText('message', event.target.value)}
            />
            {renderError('message')}
          </div>

          <div className={`${styles.checkboxField} ${styles.fieldWide}`}>
            <label htmlFor="rfq-privacy">
              <input
                id="rfq-privacy"
                name="privacy"
                type="checkbox"
                required
                checked={values.privacy}
                aria-invalid={Boolean(errors.privacy)}
                aria-describedby={`rfq-privacy-description${
                  errors.privacy ? ' rfq-privacy-error' : ''
                }`}
                ref={(node) => {
                  controls.current.privacy = node ?? undefined
                }}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    privacy: event.target.checked,
                  }))
                  setSubmittedLocally(false)
                }}
              />
              <span>{rfq.labels.privacy}</span>
            </label>
            <p id="rfq-privacy-description">{rfq.privacyText}</p>
            {renderError('privacy')}
          </div>
          </div>

          <button type="submit">{rfq.submitLabel}</button>
        </fieldset>
      </form>
    </div>
  )
}
