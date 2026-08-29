'use client'

import {useState} from 'react'

import type {
  KnownGradeItem,
  ProductsHubPresentation,
} from '@/lib/products/page-types'

import styles from './products-hub.module.css'

export function KnownGradeFilter({
  copy,
  grades,
}: {
  readonly copy: ProductsHubPresentation['knownGrade']
  readonly grades: readonly KnownGradeItem[]
}): React.ReactNode {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('en')
  const filteredGrades = grades.filter((grade) =>
    `${grade.productId} ${grade.productSlug}`
      .toLocaleLowerCase('en')
      .includes(normalizedQuery),
  )

  return (
    <div className={styles.gradeLookup}>
      <div className={styles.gradeSearchCopy}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h2 id="known-grade-heading">{copy.heading}</h2>
        <p className={styles.sectionIntro}>{copy.help}</p>
        <input
          aria-label={copy.searchLabel}
          className={styles.searchInput}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={copy.searchPlaceholder}
          type="search"
          value={query}
        />
      </div>
      <div aria-live="polite" className={styles.gradeResults}>
        {filteredGrades.length > 0 ? (
          <div className={styles.gradeList}>
            {filteredGrades.map((grade) => {
              const content = (
                <>
                  <span>
                    {grade.productId}
                    <small>{grade.familyTitle}</small>
                  </span>
                  <span aria-hidden>→</span>
                </>
              )

              return grade.href ? (
                <a
                  className={styles.gradeItem}
                  data-known-grade-family={grade.familySlug}
                  data-known-grade-item={grade.productId}
                  href={grade.href}
                  key={grade.productId}
                >
                  {content}
                </a>
              ) : (
                <div
                  className={styles.gradeItem}
                  data-known-grade-family={grade.familySlug}
                  data-known-grade-item={grade.productId}
                  key={grade.productId}
                >
                  {content}
                </div>
              )
            })}
          </div>
        ) : (
          <p className={styles.emptyState}>{copy.noResults}</p>
        )}
      </div>
    </div>
  )
}
