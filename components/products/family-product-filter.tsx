'use client'

import {useState} from 'react'

import type {
  FamilyFilter,
  FamilyProductItem,
  ProductFamilyPresentation,
} from '@/lib/products/page-types'

import styles from './product-family.module.css'

const ALL_FILTER_SLUG = 'all'

interface FamilyProductFilterProps {
  readonly filters: readonly FamilyFilter[]
  readonly products: readonly FamilyProductItem[]
  readonly copy: ProductFamilyPresentation['familyNavigation']
}

export function FamilyProductFilter({
  copy,
  filters,
  products,
}: FamilyProductFilterProps): React.ReactNode {
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER_SLUG)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const candidateCopy = new Map(
    copy.candidates.map((candidate) => [candidate.productId, candidate]),
  )
  const visibleProducts = products.filter((product) => {
    const matchesFilter =
      activeFilter === ALL_FILTER_SLUG ||
      product.filterTags.includes(activeFilter)
    const matchesQuery =
      normalizedQuery === '' ||
      product.productId.toLowerCase().includes(normalizedQuery) ||
      product.productSlug.includes(normalizedQuery)
    return matchesFilter && matchesQuery
  })
  const visibleProductIds = new Set(
    visibleProducts.map(({productId}) => productId),
  )
  const resultLabel =
    visibleProducts.length === 1
      ? copy.singularResultLabel
      : copy.pluralResultLabel

  return (
    <div className={styles.filter}>
      <div className={styles.filterBar}>
        <div className={styles.filterChips}>
          {filters.map((filter) => (
            <button
              aria-controls="family-candidate-list"
              aria-pressed={activeFilter === filter.slug}
              className={styles.filterChip}
              key={filter.slug}
              onClick={() => setActiveFilter(filter.slug)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className={styles.searchLabel}>
          <span className={styles.visuallyHidden}>{copy.searchLabel}</span>
          <input
            className={styles.searchInput}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            type="search"
            value={query}
          />
        </label>
        <button
          className={styles.resetButton}
          onClick={() => {
            setActiveFilter(ALL_FILTER_SLUG)
            setQuery('')
          }}
          type="button"
        >
          {copy.resetLabel}
        </button>
      </div>
      <div aria-live="polite" className={styles.resultStatus}>
        {visibleProducts.length > 0
          ? `${visibleProducts.length} ${resultLabel}`
          : copy.noResults}
      </div>
      <div
        className={styles.candidateList}
        id="family-candidate-list"
      >
        {products.map((product) => {
          const candidate = candidateCopy.get(product.productId)
          return (
            <article
              className={styles.candidate}
              data-family-candidate={product.productId}
              hidden={!visibleProductIds.has(product.productId)}
              key={product.productId}
            >
              <h3>
                {product.productId}{' '}
                {candidate?.badge ? (
                  <span className={styles.candidateBadge}>{candidate.badge}</span>
                ) : null}
              </h3>
              <p>{product.cardSummary}</p>
              <p className={styles.candidateFocus}>{candidate?.highlights}</p>
              {product.href ? (
                <a className={styles.candidateAction} href={product.href}>
                  {copy.candidateActionLabel}
                </a>
              ) : (
                <span className={styles.candidateAction}>
                  {copy.candidateActionLabel}
                </span>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
