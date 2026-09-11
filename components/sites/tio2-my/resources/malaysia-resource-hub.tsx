import type {MalaysiaResourceCard, MalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-types'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import {RootPageHero} from '../root-page-hero/root-page-hero'
import styles from './malaysia-resource-hub.module.css'
import {ResourceFaq} from './resource-faq'

function ResourceCards({items}: {readonly items: readonly MalaysiaResourceCard[]}) {
  return (
    <div className={styles.resourceGrid}>
      {items.map((item) => (
        <article key={item.pageId}>
          {item.contextLabel ? <p className={styles.cardKind}>{item.contextLabel}</p> : null}
          <h4><a href={item.href}>{item.title} <span aria-hidden="true">→</span></a></h4><p>{item.summary}</p>
          {item.lastReviewedAt ? <p>Last reviewed: <time dateTime={item.lastReviewedAt}>{item.lastReviewedAt}</time></p> : null}
          {item.trade ? (
            <dl>
              <div><dt>Source</dt><dd><a href={item.trade.officialSourceUrl}>{item.trade.officialSourceName}</a></dd></div>
              <div><dt>Scope</dt><dd>{item.trade.applicableScope}</dd></div>
              <div><dt>Source date</dt><dd>{item.trade.sourceDate}</dd></div>
              <div><dt>Review date</dt><dd>{item.trade.reviewDate}</dd></div>
              <div><dt>Status</dt><dd>{item.trade.publicStatusLabel}</dd></div>
            </dl>
          ) : null}
        </article>
      ))}
    </div>
  )
}

export function MalaysiaResourceHub({
  resourceHub,
  structuredData,
}: {
  readonly resourceHub: MalaysiaResourceHubDto
  readonly structuredData?: React.ReactNode
}) {
  return (
    <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my">
      {structuredData}
      <MalaysiaGlobalHeader chrome={resourceHub.globalChrome} currentPageId="RES-000" sourcePageId="RES-000" />
      <main className={styles.resourceMain}>
        <RootPageHero
          pageId="RES-000"
          variant="hub-dark"
          breadcrumbLabel="Resources"
          breadcrumbModuleName="breadcrumb"
          headingId="resource-hero-heading"
          moduleName="hero"
          eyebrow={resourceHub.hero.eyebrow}
          heading={resourceHub.hero.h1}
          intro={<p>{resourceHub.hero.body}</p>}
          actions={<a className={styles.heroAction} href={resourceHub.hero.primaryAction.href}>
                {resourceHub.hero.primaryAction.label}
              </a>}
          mediaClassName={styles.heroMedia}
          media={<div className={styles.researchDiagram} aria-hidden="true">
              <strong>{resourceHub.hero.diagram.start}</strong>
              <span className={styles.diagramLine} />
              <div>
                {resourceHub.hero.diagram.paths.map((path, index) => (
                  <span key={path}><b>{String(index + 1).padStart(2, '0')}</b>{path}</span>
                ))}
              </div>
            </div>}
        />

        <section id="browse-resources" className={styles.section} data-module="browse-resources" aria-labelledby="browse-heading">
          <h2 id="browse-heading">{resourceHub.resourceInventory.heading}</h2>
          {resourceHub.resourceGroups.map(group => (
            <section key={group.key} className={styles.resourceGroup} data-resource-group={group.key} aria-labelledby={`group-${group.key}`}>
              <h3 id={`group-${group.key}`}>{group.heading}</h3>
              <ResourceCards items={group.items} />
            </section>
          ))}
        </section>

        <section className={`${styles.section} ${styles.evidence}`} data-module="evidence-standards" aria-labelledby="evidence-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{resourceHub.evidencePrinciples.eyebrow}</p>
            <h2 id="evidence-heading">{resourceHub.evidencePrinciples.heading}</h2>
            <p>{resourceHub.evidencePrinciples.intro}</p>
          </div>
          <div className={styles.evidenceGrid}>
            {resourceHub.evidencePrinciples.items.map((item, index) => (
              <article key={item.heading}>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3>{item.heading}</h3><p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.questions}`} data-module="buyer-questions" aria-labelledby="questions-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>BUYER QUESTIONS</p>
            <h2 id="questions-heading">Buyer Questions</h2>
          </div>
          <ResourceFaq questions={resourceHub.buyerQuestions} />
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={resourceHub.globalChrome} sourcePageId="RES-000" />
    </div>
  )
}
