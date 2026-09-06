'use client'

import {useMemo, useState} from 'react'
import Link from 'next/link'

import type {MalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-types'

import styles from './malaysia-product-hub.module.css'

type Selector = MalaysiaProductHubDto['selector']
type Grade = MalaysiaProductHubDto['directory']['groups'][number]['grades'][number]

export function ProductSelector({
  selector,
  grades,
  routeReadiness,
}: {
  readonly selector: Selector
  readonly grades: readonly Grade[]
  readonly routeReadiness: Readonly<Record<string, boolean>>
}) {
  const [selectedId, setSelectedId] = useState(selector.applications[0].id)
  const selected = selector.applications.find((item) => item.id === selectedId) ?? selector.applications[0]
  const gradeById = useMemo(
    () => new Map(grades.map((grade) => [grade.gradeId, grade])),
    [grades],
  )
  const selectedGrades = selected.gradeIds.flatMap((gradeId) => {
    const grade = gradeById.get(gradeId)
    return grade ? [grade] : []
  })

  return (
    <div className={styles.selectorPanel}>
      <div className={styles.selectorControls}>
        <h3>{selector.controlLabel}</h3>
        <div className={styles.applicationGrid} role="group" aria-label={selector.controlLabel}>
          {selector.applications.map((application) => (
            <button
              key={application.id}
              type="button"
              aria-pressed={selected.id === application.id}
              onClick={() => setSelectedId(application.id)}
            >
              {selected.id === application.id ? <span aria-hidden="true">✓</span> : null}
              {application.label}
            </button>
          ))}
        </div>
        <p>{selector.notSureNote}</p>
        <Link href="/request-a-quote/?source_page_id=PRODUCT-000" data-site-scope="tio2-my" data-source-page="PRODUCT-000">
          Request a Quote <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className={styles.selectorResults} aria-live="polite" aria-atomic="true">
        <h3>{selector.resultHeading} — {selectedGrades.length}</h3>
        {selectedGrades.length ? (
          <div className={styles.resultGrid}>
            {selectedGrades.map((grade) => (
              <div key={grade.pageId}>
                <strong>{grade.gradeId}</strong>
                {routeReadiness[grade.pageId] ? (
                  <a aria-label={`View ${grade.gradeId} grade`} data-grade-action={grade.pageId} href={grade.href}>{selector.resultActionLabel}</a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noResult}>{selector.noResult}</p>
        )}
        <p className={styles.selectorDisclaimer}>{selector.disclaimer}</p>
      </div>
    </div>
  )
}
