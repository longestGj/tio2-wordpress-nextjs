import type {MalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-types'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import {MalaysiaPrivateRfqLink} from '../request-a-quote/malaysia-private-rfq-link'
import {RootPageHero} from '../root-page-hero/root-page-hero'
import styles from './malaysia-application-hub.module.css'
import {MalaysiaResponsiveDetails} from './malaysia-responsive-details'

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
    <div className={styles.site}>
      {structuredData}
      <MalaysiaGlobalHeader chrome={applicationHub.globalChrome} currentPageId="APP-000" sourcePageId="APP-000" />
      <main className={styles.main}>
        <div className={styles.wrap}>
        <RootPageHero
          pageId="APP-000"
          variant="hub-light"
          surface="open"
          breadcrumbLabel={applicationHub.breadcrumb.find((item) => item.targetPageId === 'APP-000')!.label}
          headingId="application-hub-heading"
          eyebrow="APPLICATIONS"
          heading={applicationHub.hero.h1}
          intro={<p className={styles.lead}>{applicationHub.hero.intro}</p>}
          actions={
            <>
              <a className={styles.primaryButton} href={applicationHub.hero.primaryAction.href}>{applicationHub.hero.primaryAction.label}</a>
              <MalaysiaPrivateRfqLink className={styles.outlineButton} href={applicationHub.hero.rfq.href}>{applicationHub.hero.rfq.label}</MalaysiaPrivateRfqLink>
            </>
          }
          media={<nav className={styles.heroIndex} aria-label={applicationHub.hero.selectorLabel}>
            <p>{applicationHub.hero.selectorLabel}</p>
            <ul>
              {applicationHub.applications.map((application) => (
                <li key={application.anchorId}>
                  <a href={`#${application.anchorId}`}>{application.title}<span className={styles.decorativeArrow} aria-hidden="true">↓</span></a>
                </li>
              ))}
            </ul>
          </nav>}
        />

        <section id={applicationHub.applicationPaths.anchorId} className={`${styles.section} ${styles.applicationPaths}`} aria-labelledby="application-paths-heading">
          <header>
            <h2 id="application-paths-heading">{applicationHub.applicationPaths.heading}</h2>
            <p className={styles.intro}>{applicationHub.applicationPaths.qualification}{secondSentence ? ` ${secondSentence}` : ''}</p>
          </header>
          <div className={styles.applicationGrid}>
            {applicationHub.applications.map((application) => (
              <article id={application.anchorId} key={application.anchorId} className={styles.applicationCard}>
                <div className={styles.scope}><h3>{application.title}</h3><p>{application.scope}</p></div>
                <MalaysiaResponsiveDetails className={styles.grades}>
                  <summary>{application.gradeLabel}</summary>
                  <ul className={styles.gradeList}>
                    {application.grades.map((grade, index) => (
                      <li key={`${application.anchorId}-${grade.gradeId}-${index}`}>
                        {applicationHub.routeReadiness[grade.targetPageId]
                          ? <a href={grade.href}>{grade.gradeId}</a>
                          : <span>{grade.gradeId}</span>}
                      </li>
                    ))}
                  </ul>
                </MalaysiaResponsiveDetails>
                {typeof application.targetPageId === 'string' && applicationHub.routeReadiness[application.targetPageId]
                  ? <div className={styles.applicationAction}><a className={styles.textLink} href={application.href}>{application.actionLabel}<span className={styles.decorativeArrow} aria-hidden="true">→</span></a></div>
                  : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="evaluation-heading">
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

        {supportItems.length ? <section className={`${styles.section} ${styles.support}`} aria-labelledby="support-heading">
          <header>
            <h2 id="support-heading">{applicationHub.support.heading}</h2>
          </header>
          <div className={styles.supportGrid}>
            {supportItems.map((item) => (
              <article key={item.href}>
                <h3>{item.title}</h3><p>{item.body}</p>
                <a className={styles.textLink} href={item.href}>{item.actionLabel}<span className={styles.decorativeArrow} aria-hidden="true">→</span></a>
              </article>
            ))}
          </div>
        </section> : null}

        {rfqReady ? (
          <section className={`${styles.section} ${styles.finalRfq}`} aria-labelledby="final-rfq-heading">
            <h2 id="final-rfq-heading">{applicationHub.finalRfq.heading}</h2>
            <p>{applicationHub.finalRfq.body}</p>
            <p className={styles.rfqNote}>{applicationHub.finalRfq.note}</p>
            <MalaysiaPrivateRfqLink className={styles.primaryButton} href={applicationHub.finalRfq.action.href}>{applicationHub.finalRfq.action.label}</MalaysiaPrivateRfqLink>
          </section>
        ) : null}
        </div>
      </main>
      <MalaysiaGlobalFooter chrome={applicationHub.globalChrome} sourcePageId="APP-000" />
    </div>
  )
}
