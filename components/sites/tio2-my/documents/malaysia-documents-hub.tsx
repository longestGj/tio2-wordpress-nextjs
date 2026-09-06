'use client'

import {useRef, useState} from 'react'

import type {MalaysiaDocumentsHubDto} from '@/lib/wordpress/documents-hub-v01-types'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import {DocumentsFaq} from './documents-faq'
import styles from './malaysia-documents-hub.module.css'

function DocumentIcon() {
  return <span className={styles.documentIcon} aria-hidden="true"><span /></span>
}

export function MalaysiaDocumentsHub({documentsHub, structuredData}: {readonly documentsHub: MalaysiaDocumentsHubDto; readonly structuredData?: React.ReactNode}) {
  const [grade, setGrade] = useState('')
  const [error, setError] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)
  const selector = documentsHub.gradeSelector
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    if (selector.grades.includes(grade)) return
    event.preventDefault(); setError(true); selectRef.current?.focus()
  }
  const validateSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (selector.grades.includes(grade)) return
    event.preventDefault(); setError(true); selectRef.current?.focus()
  }
  const focusSelector = () => { setError(!grade); selectRef.current?.focus() }
  return <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my">
    {structuredData}
    <MalaysiaGlobalHeader chrome={documentsHub.globalChrome} currentPageId="DOC-000" sourcePageId="DOC-000" />
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb"><ol>{documentsHub.breadcrumb.map((item, index) => <li key={item.targetPageId}>{index === documentsHub.breadcrumb.length - 1 ? <span aria-current="page">{item.label}</span> : <a href={item.href}>{item.label}</a>}</li>)}</ol></nav>
      <section className={styles.hero} data-module="hero" aria-labelledby="documents-heading">
        <div className={styles.heroCopy}><p className={styles.eyebrow}>{documentsHub.hero.eyebrow}</p><h1 id="documents-heading">{documentsHub.hero.h1}</h1><p>{documentsHub.hero.body}</p><small>{documentsHub.hero.note}</small><a className={styles.outlineButton} href={documentsHub.hero.primaryAction.href}>{documentsHub.hero.primaryAction.label}<span aria-hidden="true">→</span></a></div>
        <div className={styles.heroVisual} aria-hidden="true"><span className={styles.orbit} />{[0,1,2].map((item) => <span className={styles.paper} key={item}><DocumentIcon /></span>)}</div>
      </section>
      <section className={styles.selector} data-module="grade-selector" aria-labelledby="selector-heading">
        <div><h2 id="selector-heading">{selector.heading}</h2><p>{selector.body}</p>
          <form action={selector.receiverPath} method="get" onSubmit={submit}>
            <label htmlFor={selector.fieldId}>{selector.fieldLabel}</label>
            <select ref={selectRef} id={selector.fieldId} name="product" required value={grade} aria-invalid={error || undefined} aria-describedby="document-grade-helper document-grade-status" onChange={(event) => {setGrade(event.target.value); setError(false)}}>
              <option value="">{selector.prompt}</option>{selector.grades.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <p id="document-grade-helper" className={styles.helper}>{selector.helper}</p>
            <p id="document-grade-status" className={error ? styles.error : styles.confirmation} aria-live="polite">{error ? selector.validation : grade ? selector.selectedTemplate.replace('{GRADE}', grade) : '\u00a0'}</p>
            <p className={styles.assist}>{selector.assistancePrefix} <a href={selector.assistanceHref}>{selector.assistanceLabel}</a></p>
            <button type="submit" onClick={validateSelection}>{selector.primaryActionLabel}</button>
          </form>
        </div>
      </section>
      <section className={`${styles.section} ${styles.steps}`} data-module="how-it-works" aria-labelledby="steps-heading"><h2 id="steps-heading">{documentsHub.howItWorks.heading}</h2><ol>{documentsHub.howItWorks.items.map((item) => <li key={item.stableId}><span>{item.order}</span><div><h3>{item.heading}</h3><p>{item.body}</p></div></li>)}</ol></section>
      <section className={`${styles.section} ${styles.scenarios}`} data-module="review-scenarios" aria-labelledby="scenarios-heading"><div className={styles.sectionIntro}><h2 id="scenarios-heading">{documentsHub.reviewScenarios.heading}</h2><p>{documentsHub.reviewScenarios.intro}</p></div><div className={styles.threeGrid}>{documentsHub.reviewScenarios.items.map((item) => <article key={item.heading}><DocumentIcon /><h3>{item.heading}</h3><p>{item.body}</p></article>)}</div></section>
      <section className={`${styles.section} ${styles.categories}`} data-module="document-categories" aria-labelledby="categories-heading"><div className={styles.sectionIntro}><h2 id="categories-heading">{documentsHub.documentCategories.heading}</h2><p>{documentsHub.documentCategories.intro}</p></div><div className={styles.twoGrid}>{documentsHub.documentCategories.items.map((item) => <article key={item.heading}><DocumentIcon /><h3>{item.heading}</h3><p>{item.body}</p></article>)}</div></section>
      <section className={styles.why} data-module="why-on-request" aria-labelledby="why-heading"><DocumentIcon /><div><h2 id="why-heading">{documentsHub.whyOnRequest.heading}</h2><p>{documentsHub.whyOnRequest.body}</p></div></section>
      <section className={`${styles.section} ${styles.questions}`} data-module="buyer-questions" aria-labelledby="questions-heading"><h2 id="questions-heading">{documentsHub.buyerQuestions.heading}</h2><DocumentsFaq items={documentsHub.buyerQuestions.items} /></section>
      <section className={styles.closing} data-module="closing-cta" aria-labelledby="closing-heading"><div><p className={styles.eyebrow}>{documentsHub.closingCta.eyebrow}</p><h2 id="closing-heading">{documentsHub.closingCta.heading}</h2><p>{documentsHub.closingCta.body}</p></div>{grade ? <form action={selector.receiverPath} method="get"><input type="hidden" name="product" value={grade} /><button type="submit">{documentsHub.closingCta.selectedLabel}</button></form> : <button type="button" onClick={focusSelector}>{documentsHub.closingCta.unselectedLabel}</button>}</section>
    </main>
    <MalaysiaGlobalFooter chrome={documentsHub.globalChrome} sourcePageId="DOC-000" />
  </div>
}
