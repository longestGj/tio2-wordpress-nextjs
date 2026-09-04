'use client'

import {useId, useState} from 'react'

import styles from './malaysia-homepage.module.css'

export function ResponsiveProductGroups({children}: {readonly children: React.ReactNode}) {
  return children
}

export function ResponsiveProductGroup({children, count, title}: {
  readonly children: React.ReactNode
  readonly count: number
  readonly title: string
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const panelId = useId()

  return (
    <div
      className={styles.productGroup}
      data-product-group
      data-mobile-open={mobileOpen}
    >
      <button
        aria-controls={panelId}
        aria-expanded={mobileOpen}
        aria-label={`${title}, ${count} grades, ${mobileOpen ? 'collapse' : 'expand grades'}`}
        className={styles.productGroupToggle}
        data-product-disclosure
        onClick={() => setMobileOpen((open) => !open)}
        type="button"
      >
        <strong>{title}</strong>
        <span>{count} · {mobileOpen ? 'Collapse' : 'Expand grades'} <b aria-hidden="true">{mobileOpen ? '−' : '+'}</b></span>
      </button>
      <div className={styles.productGroupContent} id={panelId}>{children}</div>
    </div>
  )
}
