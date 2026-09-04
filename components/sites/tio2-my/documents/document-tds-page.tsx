'use client'

import {useState} from 'react'
import Link from 'next/link'

import {
  MalaysiaGlobalFooter,
  MalaysiaGlobalHeader,
} from '@/components/sites/tio2-my/malaysia-global-chrome'
import {
  buildDocumentTdsRequestHref,
  documentTdsSelectionSummary,
  normalizeDocumentTdsSelection,
} from '@/lib/documents/document-tds-state'
import type {MalaysiaDocumentTdsDto} from '@/lib/wordpress/document-tds-v01-types'

import {DocumentTdsFaq} from './document-tds-faq'
import styles from './document-tds-page.module.css'

interface BreadcrumbItem {readonly label: string; readonly route: string | null}
interface HeroModule {readonly id: 'hero'; readonly eyebrow: string; readonly breadcrumb: readonly BreadcrumbItem[]; readonly h1: string; readonly body: string; readonly primary_action: string; readonly secondary_action: string}
interface TextModule {readonly id: string; readonly heading: string; readonly body: string}
interface Choice {readonly id: string; readonly heading: string; readonly body: string; readonly selection_label: string; readonly selectable: boolean}
interface ChoiceModule {readonly id: 'document_choice'; readonly heading: string; readonly intro: string; readonly choices: readonly Choice[]}
interface GradeModule {readonly id: 'product_grade'; readonly heading: string; readonly intro: string; readonly selector_label: string; readonly placeholder: string; readonly helper: string; readonly supplementary_note: string; readonly initial_summary: string}
interface ComparisonModule {readonly id: 'comparison'; readonly heading: string; readonly intro: string; readonly columns: readonly string[]; readonly rows: readonly (readonly string[])[]; readonly note: string}
interface LabelItem {readonly label: string; readonly body: string}
interface ChecklistModule {readonly id: 'request_checklist'; readonly heading: string; readonly intro: string; readonly items: readonly LabelItem[]; readonly note: string}
interface Step {readonly number: number; readonly heading: string; readonly body: string}
interface ProcessModule {readonly id: 'request_process'; readonly heading: string; readonly intro: string; readonly steps: readonly Step[]; readonly microcopy: string}
interface FaqModule {readonly id: 'buyer_questions'; readonly heading: string; readonly items: readonly {readonly question: string; readonly answer: string}[]}
interface RelatedItem {readonly page_id: 'DOC-REACH' | 'DOC-COO' | 'DOC-000'; readonly heading: string; readonly body: string; readonly link_label: string; readonly route: string}
interface RelatedModule {readonly id: 'related_paths'; readonly heading: string; readonly intro: string; readonly items: readonly RelatedItem[]}
interface FinalModule {readonly id: 'final_cta'; readonly heading: string; readonly body: string; readonly primary_action: string; readonly secondary_action: string}

type Modules = readonly [HeroModule, TextModule, ChoiceModule, GradeModule, ComparisonModule, ChecklistModule, ProcessModule, FaqModule, RelatedModule, FinalModule]

export interface MalaysiaDocumentTdsPageProps {
  readonly page: MalaysiaDocumentTdsDto
  readonly structuredData: React.ReactNode
}

const choiceValues: Readonly<Record<string, string>> = {
  tds: 'technical_product', sds: 'safety', coa: 'quality_coa',
}

export function MalaysiaDocumentTdsPage({page, structuredData}: MalaysiaDocumentTdsPageProps) {
  const [hero, directAnswer, choice, gradeModule, comparison, checklist, process, faq, related, finalCta] = page.modules as unknown as Modules
  const [types, setTypes] = useState<readonly string[]>([])
  const [grade, setGrade] = useState('')
  const receiverReady = page.routeReadiness['CONV-DOC']
  const hubReady = page.routeReadiness['DOC-000']
  const requestHref = buildDocumentTdsRequestHref(types, grade)
  const summary = documentTdsSelectionSummary(types, grade)

  function toggleType(value: string) {
    setTypes((current) => normalizeDocumentTdsSelection(
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    ))
  }

  const requestAction = (label: string, className = styles.primaryButton) => receiverReady
    ? <a className={className} data-doc-request="primary" href={requestHref}>{label}</a>
    : null
  const hubAction = (label: string, className = styles.secondaryButton) => hubReady
    ? <Link className={className} href="/documents/">{label}</Link>
    : null

  return <div className={styles.site} data-site-scope="tio2-my" data-page-id="DOC-TDS">
    <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="DOC-000" sourcePageId="DOC-TDS" />
    <main className={styles.main}>
      <section className={styles.hero} data-module={hero.id}>
        <div className={styles.shell}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            {hero.breadcrumb.map((item, index) => <span key={item.label}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.route ? <a href={item.route}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
            </span>)}
          </nav>
          <p className={styles.eyebrow}>{hero.eyebrow}</p>
          <h1>{hero.h1}</h1>
          <p className={styles.lead}>{hero.body}</p>
          <div className={styles.actions}>{requestAction(hero.primary_action)}{hubAction(hero.secondary_action)}</div>
        </div>
      </section>

      <section className={styles.directAnswer} data-module={directAnswer.id}>
        <div className={styles.narrow}><h2>{directAnswer.heading}</h2><p>{directAnswer.body}</p></div>
      </section>

      <section className={styles.section} data-module={choice.id}>
        <div className={styles.shell}><h2>{choice.heading}</h2><p className={styles.intro}>{choice.intro}</p>
          <div className={styles.choiceGrid}>
            {choice.choices.map((item) => {
              const value = choiceValues[item.id]
              const checked = value ? types.includes(value) : false
              return item.selectable && value ? <label className={`${styles.choiceCard} ${checked ? styles.choiceSelected : ''}`} key={item.id}>
                <input type="checkbox" checked={checked} onChange={() => toggleType(value)} />
                <span className={styles.choiceLabel}>{item.selection_label}</span><strong>{item.heading}</strong><span>{item.body}</span>
              </label> : <article className={styles.choiceCard} key={item.id}>
                <span className={styles.choiceLabel}>{item.selection_label}</span><strong>{item.heading}</strong><span>{item.body}</span>
              </article>
            })}
          </div>
        </div>
      </section>

      <section className={styles.gradeSection} data-module={gradeModule.id}>
        <div className={styles.shell}><div className={styles.gradeGrid}><div>
          <h2>{gradeModule.heading}</h2><p>{gradeModule.intro}</p>
          <label className={styles.selectLabel} htmlFor="doc-tds-grade">{gradeModule.selector_label}</label>
          <select id="doc-tds-grade" value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="">{gradeModule.placeholder}</option>
            {page.request_contract.grade_options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <p className={styles.helper}>{gradeModule.helper}</p><p className={styles.note}>{gradeModule.supplementary_note}</p>
        </div><aside className={styles.selectionPanel} aria-live="polite">
          <span>REQUEST CONTEXT</span><p>{summary}</p>{requestAction(page.request_contract.primary_action_label)}
        </aside></div></div>
      </section>

      <section className={styles.section} data-module={comparison.id}>
        <div className={styles.shell}><h2>{comparison.heading}</h2><p className={styles.intro}>{comparison.intro}</p>
          <div className={styles.tableWrap}><table><thead><tr>{comparison.columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>{comparison.rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th scope="row" key={cell}>{cell}</th> : <td data-label={comparison.columns[index]} key={cell}>{cell}</td>)}</tr>)}</tbody>
          </table></div><p className={styles.note}>{comparison.note}</p>
        </div>
      </section>

      <section className={styles.tintSection} data-module={checklist.id}>
        <div className={styles.shell}><h2>{checklist.heading}</h2><p className={styles.intro}>{checklist.intro}</p>
          <div className={styles.checkGrid}>{checklist.items.map((item) => <article key={item.label}><span aria-hidden="true">✓</span><div><h3>{item.label}</h3><p>{item.body}</p></div></article>)}</div>
          <p className={styles.note}>{checklist.note}</p>
        </div>
      </section>

      <section className={styles.section} data-module={process.id}>
        <div className={styles.shell}><h2>{process.heading}</h2><p className={styles.intro}>{process.intro}</p>
          <ol className={styles.steps}>{process.steps.map((step) => <li key={step.number}><span>{step.number}</span><div><h3>{step.heading}</h3><p>{step.body}</p></div></li>)}</ol>
          <p className={styles.microcopy}>{process.microcopy}</p>
        </div>
      </section>

      <section className={styles.faqSection} data-module={faq.id}>
        <div className={styles.narrow}><h2>{faq.heading}</h2><DocumentTdsFaq items={faq.items} /></div>
      </section>

      <section className={styles.section} data-module={related.id}>
        <div className={styles.shell}><h2>{related.heading}</h2><p className={styles.intro}>{related.intro}</p>
          <div className={styles.relatedGrid}>{related.items.filter((item) => page.routeReadiness[item.page_id]).map((item) => <article data-related-page-id={item.page_id} key={item.page_id}>
            <h3>{item.heading}</h3><p>{item.body}</p><a href={item.route}>{item.link_label}<span aria-hidden="true"> →</span></a>
          </article>)}</div>
        </div>
      </section>

      <section className={styles.finalCta} data-module={finalCta.id}>
        <div className={styles.narrow}><h2>{finalCta.heading}</h2><p>{finalCta.body}</p>
          <div className={styles.actions}>{requestAction(finalCta.primary_action)}{hubAction(finalCta.secondary_action, styles.secondaryDark)}</div>
        </div>
      </section>
    </main>
    {structuredData}
    <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="DOC-TDS" />
  </div>
}
