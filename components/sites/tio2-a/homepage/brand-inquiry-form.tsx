'use client'

import {useState} from 'react'

import type {SiteABrandHomepageDto} from '@/lib/wordpress/homepage-v03-types'

import styles from './brand-homepage.module.css'

interface BrandInquiryFormProps {
  readonly inquiry: SiteABrandHomepageDto['inquiry']
}

export function BrandInquiryForm({inquiry}: BrandInquiryFormProps) {
  const [complete, setComplete] = useState(false)

  if (complete) {
    return (
      <div className={styles.formStatus} role="status">
        <strong>{inquiry.successHeading}</strong>
        <p>{inquiry.successMessage}</p>
        <button type="button" onClick={() => setComplete(false)}>Start another draft</button>
      </div>
    )
  }

  return (
    <form
      className={styles.inquiryForm}
      onSubmit={(event) => {
        event.preventDefault()
        if (event.currentTarget.reportValidity()) setComplete(true)
      }}
    >
      {inquiry.fieldLabels.map((label, index) => (
        <label key={label} className={styles.fieldLabel}>
          <span>{label}</span>
          <input
            name={`inquiry-field-${index + 1}`}
            type={index === 1 ? 'email' : 'text'}
            autoComplete={index === 0 ? 'organization' : index === 1 ? 'email' : index === 2 ? 'country-name' : 'off'}
            required={index < 4}
            maxLength={160}
            placeholder={label}
          />
        </label>
      ))}
      <label className={`${styles.fieldLabel} ${styles.messageField}`}>
        <span>{inquiry.messageLabel}</span>
        <textarea name="requirement" required maxLength={1200} placeholder={inquiry.messageLabel} />
      </label>
      <div className={styles.formAction}>
        <span>{inquiry.helperText}</span>
        <button type="submit">{inquiry.submitLabel}</button>
      </div>
    </form>
  )
}
