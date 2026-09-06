'use client'

import Link from 'next/link'
import {useEffect, useState, type ReactNode} from 'react'

import {
  MalaysiaGlobalFooter,
  MalaysiaGlobalHeader,
} from '@/components/sites/tio2-my/malaysia-global-chrome'
import type {DocumentTdsRenderModel} from '@/lib/documents/document-tds-render-model'
import {
  buildDocumentTdsRequestHref,
  documentTdsSelectionSummary,
  normalizeDocumentTdsSelection,
  type DocumentTdsType,
} from '@/lib/documents/document-tds-state'

import {DocumentTdsFaq} from './document-tds-faq'
import styles from './document-tds-page.module.css'

export interface MalaysiaDocumentTdsPageProps {
  readonly page: DocumentTdsRenderModel
  readonly fontClassName?: string
  readonly structuredData: ReactNode
}

const choiceValues: Readonly<Record<string, DocumentTdsType>> = {
  tds: 'technical_product',
  sds: 'safety',
  coa: 'quality_coa',
}

const historyStateKey = 'tio2MyDocumentTdsSelection'

interface StoredSelection {
  readonly types: DocumentTdsType[]
  readonly grade: string
}

function readStoredSelection(gradeOptions: readonly string[]): StoredSelection | null {
  if (typeof window === 'undefined') return null
  const state = window.history.state as Record<string, unknown> | null
  const candidate = state?.[historyStateKey]
  if (!candidate || typeof candidate !== 'object') return null
  const stored = candidate as {types?: unknown; grade?: unknown}
  const types = Array.isArray(stored.types)
    ? normalizeDocumentTdsSelection(stored.types.filter((value): value is string => typeof value === 'string'))
    : []
  const grade = typeof stored.grade === 'string' && gradeOptions.includes(stored.grade) ? stored.grade : ''
  return {types, grade}
}

function storeSelection(types: readonly string[], grade: string) {
  const state = window.history.state as Record<string, unknown> | null
  window.history.replaceState({
    ...(state ?? {}),
    [historyStateKey]: {types: normalizeDocumentTdsSelection(types), grade},
  }, '', window.location.href)
}

export function MalaysiaDocumentTdsPage({page, fontClassName = '', structuredData}: MalaysiaDocumentTdsPageProps) {
  const [hero, directAnswer, choice, gradeModule, comparison, checklist, process, faq, related, finalCta] = page.modules
  const [types, setTypes] = useState<readonly DocumentTdsType[]>([])
  const [grade, setGrade] = useState('')
  const requestHref = buildDocumentTdsRequestHref(types, grade)
  const summary = documentTdsSelectionSummary(types, grade)

  useEffect(() => {
    const restore = () => {
      const stored = readStoredSelection(page.request.gradeOptions)
      if (!stored) return
      setTypes(stored.types)
      setGrade(stored.grade)
    }
    restore()
    window.addEventListener('pageshow', restore)
    window.addEventListener('popstate', restore)
    return () => {
      window.removeEventListener('pageshow', restore)
      window.removeEventListener('popstate', restore)
    }
  }, [page.request.gradeOptions])

  function toggleType(value: DocumentTdsType) {
    setTypes((current) => {
      const next = normalizeDocumentTdsSelection(
        current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
      )
      storeSelection(next, grade)
      return next
    })
  }

  function updateGrade(value: string) {
    setGrade(value)
    storeSelection(types, value)
  }

  const requestAction = (label: string, className = styles.primaryButton) => page.request.requestEnabled
    ? <a className={className} data-doc-request="primary" href={requestHref}>{label}</a>
    : null
  const hubAction = (label: string, className = styles.secondaryButton) => page.request.documentHubEnabled
    ? <Link className={className} href={page.request.documentHubRoute}>{label}</Link>
    : null

  const decisionKey = [
    {code: 'TDS', heading: choice.choices[0].heading, detail: 'Grade-level information'},
    {code: 'SDS', heading: choice.choices[1].heading, detail: 'Product, jurisdiction and language context'},
    {code: 'COA', heading: choice.choices[2].heading, detail: 'Lot-, batch- or order-specific results'},
  ]

  return <div className={styles.site} data-site-scope="tio2-my" data-page-id="DOC-TDS">
    <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="DOC-000" sourcePageId="DOC-TDS" />
    <main className={`${styles.main} ${fontClassName}`}>
      <section className={styles.hero} data-module={hero.id}>
        <div className={styles.shell}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            {hero.breadcrumb.map((item, index) => <span key={item.label}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.route ? <a href={item.route}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
            </span>)}
          </nav>
          <div className={styles.heroGrid} data-visual="hero-grid">
            <div>
              <p className={styles.eyebrow}>{hero.eyebrow}</p>
              <h1>{hero.h1}</h1>
              <p className={styles.lead}>{hero.body}</p>
              <div className={styles.actions}>{requestAction(hero.primary_action)}{hubAction(hero.secondary_action)}</div>
            </div>
            <aside className={styles.decisionKey} aria-label="Document decision key">
              <p className={styles.decisionKeyTitle}>Three documents · three review needs</p>
              {decisionKey.map((item) => <div className={styles.keyRow} key={item.code}>
                <span className={styles.keyToken}>{item.code}</span>
                <div><strong>{item.heading}</strong><span>{item.detail}</span></div>
              </div>)}
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.directAnswer} data-module={directAnswer.id}>
        <div className={`${styles.shell} ${styles.answerGrid}`}><h2>{directAnswer.heading}</h2><p>{directAnswer.body}</p></div>
      </section>

      <section className={styles.section} data-module={choice.id}>
        <div className={styles.shell}><p className={styles.eyebrow}>CHOOSE BY REVIEW NEED</p><h2>{choice.heading}</h2><p className={styles.intro}>{choice.intro}</p>
          <div className={styles.choiceGrid}>
            {choice.choices.map((item) => {
              const value = choiceValues[item.id]
              const checked = value ? types.includes(value) : false
              return item.selectable && value ? <label className={`${styles.choiceCard} ${checked ? styles.choiceSelected : ''}`} htmlFor={`doc-tds-choice-${item.id}`} key={item.id}>
                <input id={`doc-tds-choice-${item.id}`} name="document_types[]" type="checkbox" value={value} checked={checked} onChange={() => toggleType(value)} />
                <span className={styles.choiceCode}>{item.selection_label}</span><h3>{item.heading}</h3><p>{item.body}</p><span className={styles.choiceLabel}>{item.selection_label}</span>
              </label> : <article className={`${styles.choiceCard} ${styles.choiceExplainer}`} key={item.id}>
                <span className={styles.choiceCode} aria-hidden="true">+</span><h3>{item.heading}</h3><p>{item.body}</p><span className={styles.choiceLabel}>{item.selection_label}</span>
              </article>
            })}
          </div>
        </div>
      </section>

      <section className={styles.gradeSection} data-module={gradeModule.id}>
        <div className={`${styles.shell} ${styles.gradeGrid}`}><div>
          <p className={styles.eyebrow}>ADD PRODUCT CONTEXT</p><h2>{gradeModule.heading}</h2><p className={styles.intro}>{gradeModule.intro}</p>
          <p className={styles.supplementaryNote}>{gradeModule.supplementary_note}</p>
        </div><aside className={styles.selectionPanel}>
          <label className={styles.selectLabel} htmlFor="doc-tds-grade">{gradeModule.selector_label}</label>
          <select id="doc-tds-grade" name="product_grade" value={grade} onChange={(event) => updateGrade(event.target.value)}>
            <option value="">{gradeModule.placeholder}</option>
            {page.request.gradeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <p className={styles.helper}>{gradeModule.helper}</p><p className={styles.selectionSummary} aria-live="polite">{summary}</p>
          {requestAction(page.request.primaryActionLabel)}
        </aside></div>
      </section>

      <section className={styles.section} data-module={comparison.id}>
        <div className={styles.shell}><p className={styles.eyebrow}>DOCUMENT COMPARISON</p><h2>{comparison.heading}</h2><p className={styles.intro}>{comparison.intro}</p>
          <div className={styles.tableWrap}><table><thead><tr>{comparison.columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>{comparison.rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th scope="row" key={cell}>{cell}</th> : <td data-label={comparison.columns[index]} key={cell}>{cell}</td>)}</tr>)}</tbody>
          </table></div>
          <div className={styles.comparisonCards}>
            {comparison.columns.slice(1).map((column, columnIndex) => <article className={styles.comparisonCard} key={column}>
              <h3>{column}</h3>
              {comparison.rows.map((row) => <div className={styles.comparisonRow} key={row[0]}><strong>{row[0]}</strong><span>{row[columnIndex + 1]}</span></div>)}
            </article>)}
          </div>
          <p className={styles.note}>{comparison.note}</p>
        </div>
      </section>

      <section className={styles.tintSection} data-module={checklist.id}>
        <div className={styles.shell}><p className={styles.eyebrow}>PREPARE USEFUL CONTEXT</p><h2>{checklist.heading}</h2><p className={styles.intro}>{checklist.intro}</p>
          <ul className={styles.checkGrid}>{checklist.items.map((item) => <li key={item.label}><span aria-hidden="true">✓</span><div><h3>{item.label}</h3><p>{item.body}</p></div></li>)}</ul>
          <p className={styles.note}>{checklist.note}</p>
        </div>
      </section>

      <section className={styles.section} data-module={process.id}>
        <div className={styles.shell}><p className={styles.eyebrow}>FOUR REVIEW STEPS</p><h2>{process.heading}</h2><p className={styles.intro}>{process.intro}</p>
          <ol className={styles.steps}>{process.steps.map((step) => <li key={step.number}><span>{String(step.number).padStart(2, '0')}</span><div><h3>{step.heading}</h3><p>{step.body}</p></div></li>)}</ol>
          <p className={styles.microcopy}>{process.microcopy}</p>
        </div>
      </section>

      <section className={styles.faqSection} data-module={faq.id}>
        <div className={styles.shell}><p className={styles.eyebrow}>PRACTICAL ANSWERS</p><h2>{faq.heading}</h2><DocumentTdsFaq items={faq.items} /></div>
      </section>

      <section className={styles.section} data-module={related.id}>
        <div className={styles.shell}><p className={styles.eyebrow}>CONTINUE YOUR DOCUMENT REVIEW</p><h2>{related.heading}</h2><p className={styles.intro}>{related.intro}</p>
          <div className={styles.relatedGrid}>{related.items.map((item) => <article data-related-page-id={item.page_id} key={item.page_id}>
            <h3>{item.heading}</h3><p>{item.body}</p><a href={item.route}>{item.link_label}<span aria-hidden="true"> →</span></a>
          </article>)}</div>
        </div>
      </section>

      <section className={styles.finalCta} data-module={finalCta.id}>
        <div className={`${styles.shell} ${styles.finalGrid}`} data-visual="final-grid"><div><p className={styles.eyebrow}>DOCUMENT REQUEST</p><h2>{finalCta.heading}</h2><p>{finalCta.body}</p></div>
          <div className={styles.actions}>{requestAction(finalCta.primary_action)}{hubAction(finalCta.secondary_action, styles.secondaryDark)}</div>
        </div>
      </section>
    </main>
    {structuredData}
    <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="DOC-TDS" />
  </div>
}
