import type {
  MalaysiaResourceOriginDto,
  MalaysiaResourceOriginEligibleRelation,
} from '@/lib/wordpress/resource-origin-v01-types'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-resource-origin-page.module.css'
import {ResourceOriginFaq} from './resource-origin-faq'

function relationMap(relations: readonly MalaysiaResourceOriginEligibleRelation[]) {
  return new Map(relations.map((relation) => [relation.relationKey, relation] as const))
}

function Action({
  label,
  relation,
  secondary = false,
}: {
  readonly label: string
  readonly relation?: MalaysiaResourceOriginEligibleRelation
  readonly secondary?: boolean
}) {
  return relation ? <a className={secondary ? styles.secondaryAction : styles.primaryAction} href={relation.href}>{label}</a> : null
}

export function MalaysiaResourceOriginPage({
  page,
  structuredData,
}: {
  readonly page: MalaysiaResourceOriginDto
  readonly structuredData?: React.ReactNode
}) {
  const relations = relationMap(page.eligibleRelations)
  return (
    <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my">
      {structuredData}
      <div className={styles.chromeModule} data-res-origin-module="GLOBAL_HEADER">
        <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="RES-000" sourcePageId="RES-ORIGIN" />
      </div>
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-res-origin-module="BREADCRUMB">
          <ol>
            {page.breadcrumb.map((item, index) => {
              const relation = item.relationKey ? relations.get(item.relationKey) : undefined
              return (
                <li key={item.targetPageId}>
                  {index === page.breadcrumb.length - 1
                    ? <span aria-current="page">{item.label}</span>
                    : relation ? <a href={relation.href}>{item.label}</a> : <span>{item.label}</span>}
                </li>
              )
            })}
          </ol>
        </nav>

        <section className={styles.hero} data-res-origin-module="HERO" aria-labelledby="res-origin-heading">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{page.hero.eyebrow}</p>
              <h1 id="res-origin-heading">{page.hero.h1}</h1>
              <p>{page.hero.supportingCopy}</p>
              <div className={styles.actions}>
                <Action label={page.hero.primaryAction.label} relation={relations.get(page.hero.primaryAction.relationKey)} />
                <Action label={page.hero.secondaryAction.label} relation={relations.get(page.hero.secondaryAction.relationKey)} secondary />
              </div>
            </div>
            <div className={styles.qualificationPanel}>
              <div>Qualification path <span>6 checks</span></div>
              <ol className={styles.qualificationPath} aria-label="Qualification path">
                {page.hero.qualificationPath.map((item, index) => (
                  <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className={`${styles.sectionWide} ${styles.directAnswer}`} data-res-origin-module="DIRECT_ANSWER" aria-labelledby="direct-answer-heading">
          <div className={styles.directAnswerInner}>
            <div><p className={styles.eyebrow}>{page.directAnswer.eyebrow}</p><h2 id="direct-answer-heading">{page.directAnswer.heading}</h2></div>
            <div><p className={styles.lead}>{page.directAnswer.answer}</p><p className={styles.supporting}>{page.directAnswer.supportingSentence}</p></div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.checks}`} data-res-origin-module="SIX_CHECKS" aria-labelledby="checks-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{page.dueDiligence.eyebrow}</p>
            <h2 id="checks-heading">{page.dueDiligence.heading}</h2>
            <p>{page.dueDiligence.introduction}</p>
          </div>
          <div className={styles.checkGrid}>
            {page.dueDiligence.checks.map((item) => (
              <article key={item.number}>
                <span className={styles.number}>{item.number}</span>
                <h3>{item.heading}</h3>
                <p>{item.body}</p>
                <p className={styles.buyerCheck}><strong>Buyer check</strong>{item.buyerCheck}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.sectionWide} ${styles.technical}`} data-res-origin-module="TECHNICAL_COMPARISON" aria-labelledby="technical-heading">
          <div className={styles.technicalInner}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>{page.technicalComparison.eyebrow}</p>
              <h2 id="technical-heading">{page.technicalComparison.heading}</h2>
              <p>{page.technicalComparison.body}</p>
            </div>
            <ol className={styles.stepList}>
              {page.technicalComparison.steps.map((step, index) => (
                <li key={step}><span>{String(index + 1).padStart(2, '0')}</span>{step}</li>
              ))}
            </ol>
            <aside className={styles.callout}>{page.technicalComparison.callout}</aside>
          </div>
        </section>

        <section className={`${styles.section} ${styles.application}`} data-res-origin-module="APPLICATION_CONTEXT" aria-labelledby="application-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{page.applicationContext.eyebrow}</p>
            <h2 id="application-heading">{page.applicationContext.heading}</h2>
            <p>{page.applicationContext.body}</p>
            <p>{page.applicationContext.supportingCopy}</p>
          </div>
          <ul className={styles.routeList}>
            {page.applicationContext.routes.map((item) => {
              const relation = relations.get(item.relationKey)
              return <li key={item.label}>{relation ? <a href={relation.href}>{item.label}<span aria-hidden="true">→</span></a> : <span>{item.label}</span>}</li>
            })}
          </ul>
        </section>

        <section className={`${styles.sectionWide} ${styles.documents}`} data-res-origin-module="DOCUMENT_SCOPE" aria-labelledby="documents-heading">
          <div className={styles.documentsInner}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>{page.documentScope.eyebrow}</p>
              <h2 id="documents-heading">{page.documentScope.heading}</h2>
              <p>{page.documentScope.introduction}</p>
            </div>
            <ul className={styles.evidenceList}>{page.documentScope.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className={styles.supporting}>{page.documentScope.supportingCopy}</p>
            <Action label={page.documentScope.action.label} relation={relations.get(page.documentScope.action.relationKey)} />
          </div>
        </section>

        <section className={`${styles.section} ${styles.destinations}`} data-res-origin-module="DESTINATION_REVIEW" aria-labelledby="destinations-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{page.destinationReview.eyebrow}</p>
            <h2 id="destinations-heading">{page.destinationReview.heading}</h2>
            <p>{page.destinationReview.introduction}</p>
          </div>
          <div className={styles.destinationGrid}>
            {page.destinationReview.destinations.map((item) => {
              const relation = relations.get(item.relationKey)
              return <article key={item.name}><h3>{item.name}</h3><p>{item.body}</p>{relation ? <a href={relation.href}>{item.actionLabel}<span aria-hidden="true">→</span></a> : null}</article>
            })}
          </div>
          <p className={styles.closing}>{page.destinationReview.closingCopy}</p>
        </section>

        <section className={`${styles.sectionWide} ${styles.decision}`} data-res-origin-module="QUALIFICATION_DECISION" aria-labelledby="decision-heading">
          <div className={styles.decisionInner}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>{page.qualificationDecision.eyebrow}</p>
              <h2 id="decision-heading">{page.qualificationDecision.heading}</h2>
            </div>
            <div className={styles.decisionGrid}>{page.qualificationDecision.items.map((item) => <article key={item.heading}><h3>{item.heading}</h3><p>{item.body}</p></article>)}</div>
            <p className={styles.decisionNote}>{page.qualificationDecision.note}</p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.questions}`} data-res-origin-module="BUYER_QUESTIONS" aria-labelledby="questions-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{page.buyerQuestions.eyebrow}</p>
            <h2 id="questions-heading">{page.buyerQuestions.heading}</h2>
          </div>
          <ResourceOriginFaq questions={page.buyerQuestions.items} />
        </section>

        <section className={styles.finalAction} data-res-origin-module="FINAL_ACTION" aria-labelledby="final-action-heading">
          <div className={styles.finalActionInner}>
            <div>
              <p className={styles.eyebrow}>{page.finalAction.eyebrow}</p>
              <h2 id="final-action-heading">{page.finalAction.heading}</h2>
              <p>{page.finalAction.body}</p>
            </div>
            <div className={styles.actions}>
              <Action label={page.finalAction.primaryAction.label} relation={relations.get(page.finalAction.primaryAction.relationKey)} />
              <Action label={page.finalAction.secondaryAction.label} relation={relations.get(page.finalAction.secondaryAction.relationKey)} secondary />
            </div>
          </div>
        </section>
      </main>
      <div className={styles.chromeModule} data-res-origin-module="GLOBAL_FOOTER">
        <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="RES-ORIGIN" />
      </div>
    </div>
  )
}
