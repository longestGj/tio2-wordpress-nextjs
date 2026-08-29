'use client'

import {useState} from 'react'

import type {
  FamilyFilter,
  FamilyProductItem,
  ProductFamilyPresentation,
} from '@/lib/products/page-types'

import styles from './product-family.module.css'

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
  const defaultFilter = filters[0]?.slug ?? ''
  const [activeFilter, setActiveFilter] = useState(defaultFilter)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleProducts = products.filter((product) => {
    const matchesFilter =
      activeFilter === defaultFilter || product.filterTags.includes(activeFilter)
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
            setActiveFilter(defaultFilter)
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
        {products.map((product) => (
          <article
            className={styles.candidate}
            data-family-candidate={product.productId}
            hidden={!visibleProductIds.has(product.productId)}
            key={product.productId}
          >
            <h3>{product.productId}</h3>
            <p>{product.cardSummary}</p>
            <p className={styles.candidateFocus}>{product.performanceFocus}</p>
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
        ))}
      </div>
    </div>
  )
}
