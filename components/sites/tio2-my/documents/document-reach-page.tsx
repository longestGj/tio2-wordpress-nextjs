import type {ReactNode} from 'react'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '@/components/sites/tio2-my/malaysia-global-chrome'
import type {DocumentReachRenderModel} from '@/lib/documents/document-reach-render-model'

import {DocumentReachFaq} from './document-reach-faq'
import styles from './document-reach-page.module.css'

interface Props {
  readonly page: DocumentReachRenderModel
  readonly fontClassName?: string
  readonly structuredData: ReactNode
}

export function MalaysiaDocumentReachPage({page, fontClassName = '', structuredData}: Props) {
  const [hero, answer, substance, actor, scope, checklist, sources, process, faq, related, finalCta] = page.modules
  const requestAction = (label: string) => page.request.enabled
    ? <a className={styles.primaryButton} data-document-reach-request="primary" href={page.request.href}>{label}</a>
    : null
  const hubAction = (label: string, dark = false) => page.request.hubEnabled
    ? <a className={dark ? styles.secondaryDark : styles.secondaryButton} href={page.request.hubRoute}>{label}</a>
    : null

  return <div className={styles.site} data-site-scope="tio2-my" data-page-id="DOC-REACH">
    <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="DOC-000" sourcePageId="DOC-REACH" />
    <main className={`${styles.main} ${fontClassName}`}>
      <section className={styles.hero} data-module={hero.id}>
        <div className={styles.shell}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            {hero.breadcrumb.map((item, index) => <span key={item.label}>
              {index ? <span aria-hidden="true">/</span> : null}
              {item.route ? <a href={item.route}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
            </span>)}
          </nav>
          <div className={styles.heroGrid}>
            <div><p className={styles.eyebrow}>{hero.eyebrow}</p><h1>{hero.h1}</h1><p className={styles.lead}>{hero.body}</p><p className={styles.scopeLine}>{hero.scope_line}</p>
              <div className={styles.actions}>{requestAction(hero.primary_action)}{hubAction(hero.secondary_action)}</div>
            </div>
            <aside className={styles.orientation} aria-labelledby="reach-orientation-heading">
              <h2 id="reach-orientation-heading">{hero.orientation_heading}</h2>
              {hero.orientation.map((item) => <div key={item.label}><strong>{item.label}</strong><p>{item.body}</p></div>)}
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.answer} data-module={answer.id}><div className={`${styles.shell} ${styles.answerGrid}`}><h2>{answer.heading}</h2><p>{answer.body}</p></div></section>

      <section className={styles.section} data-module={substance.id}><div className={styles.shell}><p className={styles.eyebrow}>EVIDENCE BOUNDARY</p><h2>{substance.heading}</h2><p className={styles.intro}>{substance.intro}</p><div className={styles.cardGrid}>{substance.items.map((item) => <article key={item.heading}><h3>{item.heading}</h3><p>{item.body}</p></article>)}</div></div></section>

      <section className={styles.tintSection} data-module={actor.id}><div className={styles.shell}><p className={styles.eyebrow}>LEGAL ACTOR</p><h2>{actor.heading}</h2><p className={styles.intro}>{actor.intro}</p><div className={styles.roleGrid}>{actor.roles.map((item, index) => <article key={item.heading}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{item.heading}</h3><p>{item.body}</p></article>)}</div><p className={styles.note}>{actor.note}</p></div></section>

      <section className={styles.section} data-module={scope.id}><div className={styles.shell}><p className={styles.eyebrow}>REGULATORY SCOPE</p><h2>{scope.heading}</h2><div className={styles.scopeGrid}>{scope.jurisdictions.map((item) => <article key={item.heading}><h3>{item.heading}</h3><p>{item.body}</p></article>)}</div><p className={styles.note}>{scope.note}</p></div></section>

      <section className={styles.checkSection} data-module={checklist.id}><div className={styles.shell}><p className={styles.eyebrow}>BUYER CHECKLIST</p><h2>{checklist.heading}</h2><p className={styles.intro}>{checklist.intro}</p><ul className={styles.checkGrid}>{checklist.items.map((item) => <li key={item.label}><span aria-hidden="true">✓</span><div><h3>{item.label}</h3><p>{item.body}</p></div></li>)}</ul><p className={styles.note}>{checklist.threshold_note}</p></div></section>

      <section className={styles.section} data-module={sources.id}><div className={styles.shell}><p className={styles.eyebrow}>OFFICIAL SOURCE LEDGER</p><h2>{sources.heading}</h2><p className={styles.intro}>{sources.intro}</p><div className={styles.sourceList}>{sources.items.map((item) => <article data-official-source={item.name} key={item.name}><div><h3>{item.name}</h3><p>{item.scope}</p></div><dl>{item.source_updated_date ? <><dt>Source updated:</dt><dd>{item.source_updated_date}</dd></> : null}<dt>Site reviewed:</dt><dd>{item.site_reviewed_date}</dd></dl><a href={item.url}>{item.link_label}<span aria-hidden="true"> ↗</span></a></article>)}</div><p className={styles.note}>{sources.boundary}</p></div></section>

      <section className={styles.processSection} data-module={process.id}><div className={`${styles.shell} ${styles.processGrid}`}><div><p className={styles.eyebrow}>REQUEST PROCESS</p><h2>{process.heading}</h2><ol className={styles.steps}>{process.steps.map((step) => <li key={step.number}><span>{String(step.number).padStart(2, '0')}</span><div><h3>{step.heading}</h3><p>{step.body}</p></div></li>)}</ol></div>{page.request.enabled ? <aside className={styles.selectionPanel} data-request-selection={page.request.semanticLabel}><p>Request selection</p><h3>{process.request_selection}</h3><p>{page.request.note}</p>{requestAction(page.request.label)}</aside> : null}</div></section>

      <section className={styles.faqSection} data-module={faq.id}><div className={styles.shell}><p className={styles.eyebrow}>BUYER QUESTIONS</p><h2>{faq.heading}</h2><DocumentReachFaq items={faq.items} /></div></section>

      <section className={styles.section} data-module={related.id}><div className={styles.shell}><p className={styles.eyebrow}>RELATED PATHS</p><h2>{related.heading}</h2><div className={styles.relatedGrid}>{related.items.map((item) => <article data-related-page-id={item.page_id} key={item.page_id}><h3>{item.heading}</h3><p>{item.body}</p><a href={item.route}>{item.link_label}<span aria-hidden="true"> →</span></a></article>)}</div></div></section>

      <section className={styles.finalCta} data-module={finalCta.id}><div className={`${styles.shell} ${styles.finalGrid}`}><div><p className={styles.eyebrow}>REACH DOCUMENTATION</p><h2>{finalCta.heading}</h2><p>{finalCta.body}</p>{page.request.enabled ? <p className={styles.finalNote}>{finalCta.note}</p> : null}</div><div className={styles.actions}>{requestAction(finalCta.primary_action)}{hubAction(finalCta.secondary_action, true)}</div></div></section>
    </main>
    {structuredData}
    <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="DOC-REACH" />
  </div>
}
