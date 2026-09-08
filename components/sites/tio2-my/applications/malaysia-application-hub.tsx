import type {MalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-types'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-application-hub.module.css'

export function MalaysiaApplicationHub({
  applicationHub,
  structuredData,
}: {
  readonly applicationHub: MalaysiaApplicationHubDto
  readonly structuredData?: React.ReactNode
}) {
  const rfqReady = applicationHub.routeReadiness[applicationHub.hero.rfq.targetPageId]
  const anyGradeReady = applicationHub.applications.some((application) =>
    application.grades.some((grade) => applicationHub.routeReadiness[grade.targetPageId]),
  )
  const anyApplicationReady = applicationHub.applications.some((application) =>
    typeof application.targetPageId === 'string' && applicationHub.routeReadiness[application.targetPageId],
  )
  const secondSentence = anyGradeReady && anyApplicationReady
    ? applicationHub.applicationPaths.sentences.both
    : anyGradeReady
      ? applicationHub.applicationPaths.sentences.gradesOnly
      : anyApplicationReady
        ? applicationHub.applicationPaths.sentences.applicationsOnly
        : null
  const supportItems = applicationHub.support.items.filter(
    (item) => applicationHub.routeReadiness[item.targetPageId],
  )

  return (
    <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my">
      {structuredData}
      <MalaysiaGlobalHeader chrome={applicationHub.globalChrome} currentPageId="APP-000" sourcePageId="APP-000" />
      <main className={styles.main}>
        <div className={styles.wrap}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <ol>
            {applicationHub.breadcrumb.map((item, index) => (
              <li key={item.targetPageId}>
                {index === applicationHub.breadcrumb.length - 1
                  ? <span aria-current="page">{item.label}</span>
                  : <a href={item.href}>{item.label}</a>}
              </li>
            ))}
          </ol>
        </nav>

        <section className={styles.hero} data-module="hero" aria-labelledby="application-hub-heading">
          <div className={styles.heroCopy}>
            <h1 id="application-hub-heading">{applicationHub.hero.h1}</h1>
            <p className={styles.lead}>{applicationHub.hero.intro}</p>
            <div className={styles.actions}>
              <a className={styles.primaryButton} href={applicationHub.hero.primaryAction.href}>{applicationHub.hero.primaryAction.label}</a>
              {rfqReady ? <a className={styles.outlineButton} href={applicationHub.hero.rfq.href} data-source-page="APP-000">{applicationHub.hero.rfq.label}</a> : null}
            </div>
          </div>
          <nav className={styles.heroIndex} aria-label={applicationHub.hero.selectorLabel}>
            <p>{applicationHub.hero.selectorLabel}</p>
            <ul>
              {applicationHub.applications.map((application) => (
                <li key={application.key}>
                  <a href={`#${application.anchorId}`}>{application.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <section id={applicationHub.applicationPaths.anchorId} className={styles.section} data-module="application-paths" aria-labelledby="application-paths-heading">
          <header>
            <h2 id="application-paths-heading">{applicationHub.applicationPaths.heading}</h2>
            <p className={styles.intro}>{applicationHub.applicationPaths.qualification}{secondSentence ? ` ${secondSentence}` : ''}</p>
          </header>
          <div className={styles.applicationGrid}>
            {applicationHub.applications.map((application) => (
              <article id={application.anchorId} key={application.key} className={styles.applicationCard}>
                <div className={styles.scope}><h3>{application.title}</h3><p>{application.scope}</p></div>
                <details className={styles.grades} open>
                  <summary>{application.gradeLabel}</summary>
                  <ul className={styles.gradeList}>
                    {application.grades.map((grade) => (
                      <li key={grade.edgeId} data-grade-occurrence={grade.edgeId}>
                        {applicationHub.routeReadiness[grade.targetPageId]
                          ? <a href={grade.href} data-grade-state="linked">{grade.gradeId}</a>
                          : <span data-grade-state="plain">{grade.gradeId}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
                {typeof application.targetPageId === 'string' && applicationHub.routeReadiness[application.targetPageId]
                  ? <div className={styles.applicationAction}><a className={styles.textLink} href={application.href} data-application-action={application.targetPageId}>{application.actionLabel}</a></div>
                  : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} data-module="evaluation-guide" aria-labelledby="evaluation-heading">
          <header>
            <h2 id="evaluation-heading">{applicationHub.evaluation.heading}</h2>
          </header>
          <ol className={styles.steps}>
            {applicationHub.evaluation.items.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong><p>{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {supportItems.length ? <section className={`${styles.section} ${styles.support}`} data-module="procurement-paths" aria-labelledby="support-heading">
          <header>
            <h2 id="support-heading">{applicationHub.support.heading}</h2>
          </header>
          <div className={styles.supportGrid}>
            {supportItems.map((item) => (
              <article key={item.targetPageId}>
                <h3>{item.title}</h3><p>{item.body}</p>
                <a className={styles.textLink} href={item.href} data-support-action={item.targetPageId}>{item.actionLabel}</a>
              </article>
            ))}
          </div>
        </section> : null}

        {rfqReady ? (
          <section className={`${styles.section} ${styles.finalRfq}`} data-module="final-rfq" aria-labelledby="final-rfq-heading">
            <h2 id="final-rfq-heading">{applicationHub.finalRfq.heading}</h2>
            <p>{applicationHub.finalRfq.body}</p>
            <p className={styles.rfqNote}>{applicationHub.finalRfq.note}</p>
            <a className={styles.primaryButton} href={applicationHub.finalRfq.action.href} data-source-page="APP-000">{applicationHub.finalRfq.action.label}</a>
          </section>
        ) : null}
        </div>
      </main>
      <MalaysiaGlobalFooter chrome={applicationHub.globalChrome} sourcePageId="APP-000" />
    </div>
  )
}
