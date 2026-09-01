import type {MalaysiaResourceCard, MalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-types'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-resource-hub.module.css'
import {ResourceFaq} from './resource-faq'

function ResourceCards({items}: {readonly items: readonly MalaysiaResourceCard[]}) {
  return (
    <div className={styles.resourceGrid}>
      {items.map((item) => (
        <article key={item.pageId}>
          <p className={styles.cardKind}>{item.kind === 'trade' ? 'TRADE & MARKET UPDATE' : 'PROCUREMENT RESOURCE'}</p>
          <h3>{item.title}</h3><p>{item.summary}</p>
          {item.trade ? (
            <dl>
              <div><dt>Source</dt><dd>{item.trade.officialSource}</dd></div>
              <div><dt>Scope</dt><dd>{item.trade.applicableScope}</dd></div>
              <div><dt>Source date</dt><dd>{item.trade.sourceDate}</dd></div>
              <div><dt>Review date</dt><dd>{item.trade.reviewDate}</dd></div>
            </dl>
          ) : null}
          <a href={item.href}>Read resource <span aria-hidden="true">→</span></a>
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
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <ol>
            {resourceHub.breadcrumb.map((item, index) => (
              <li key={item.targetPageId}>
                {index === resourceHub.breadcrumb.length - 1
                  ? <span aria-current="page">{item.label}</span>
                  : <a href={item.href}>{item.label}</a>}
              </li>
            ))}
          </ol>
        </nav>

        <section className={styles.hero} data-module="hero" aria-labelledby="resource-hero-heading">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{resourceHub.hero.eyebrow}</p>
              <h1 id="resource-hero-heading">{resourceHub.hero.h1}</h1>
              <p>{resourceHub.hero.body}</p>
              <a href={resourceHub.featuredResources.length ? '#featured-resources' : resourceHub.hero.primaryAction.href}>
                {resourceHub.hero.primaryAction.label}
              </a>
            </div>
            <div className={styles.researchDiagram} aria-hidden="true">
              <strong>{resourceHub.hero.diagram.start}</strong>
              <span className={styles.diagramLine} />
              <div>
                {resourceHub.hero.diagram.paths.map((path, index) => (
                  <span key={path}><b>{String(index + 1).padStart(2, '0')}</b>{path}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {resourceHub.featuredResources.length ? (
          <section id="featured-resources" className={`${styles.section} ${styles.featured}`} data-module="featured-resources" aria-labelledby="featured-heading">
            <p className={styles.eyebrow}>FEATURED RESOURCES</p>
            <h2 id="featured-heading">Featured procurement research</h2>
            <ResourceCards items={resourceHub.featuredResources} />
          </section>
        ) : null}

        <section id={resourceHub.decisionPaths.anchorId} className={`${styles.section} ${styles.paths}`} data-module="research-paths" aria-labelledby="paths-heading">
          <div className={styles.sectionIntro}>
            <h2 id="paths-heading">{resourceHub.decisionPaths.heading}</h2>
            <p>{resourceHub.decisionPaths.intro}</p>
          </div>
          <div className={styles.pathGrid}>
            {resourceHub.decisionPaths.items.map((item) => (
              <article key={item.label}>
                <p className={styles.pathLabel}>{item.label}</p>
                <h3>{item.heading}</h3><p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        {resourceHub.latestResources.length ? (
          <section className={`${styles.section} ${styles.latest}`} data-module="latest-research" aria-labelledby="latest-heading">
            <p className={styles.eyebrow}>LATEST RESEARCH</p>
            <h2 id="latest-heading">Latest procurement research</h2>
            <ResourceCards items={resourceHub.latestResources} />
          </section>
        ) : null}

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
