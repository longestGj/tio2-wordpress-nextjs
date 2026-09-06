import type {MalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-types'

import {
  MalaysiaGlobalFooter,
  MalaysiaGlobalHeader,
} from '../malaysia-global-chrome'
import styles from './malaysia-product-hub.module.css'
import {ProductFaq} from './product-faq'
import {ProductSelector} from './product-selector'

function Eyebrow({children}: {readonly children: React.ReactNode}) {
  return <p className={styles.eyebrow}>{children}</p>
}

function SectionIntro({
  eyebrow,
  heading,
  intro,
  headingId,
}: {
  readonly eyebrow: string
  readonly heading: string
  readonly intro: string
  readonly headingId: string
}) {
  return (
    <div className={styles.sectionIntro}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={headingId}>{heading}</h2>
      <p>{intro}</p>
    </div>
  )
}

export function MalaysiaProductHub({
  productHub,
  structuredData,
}: {
  readonly productHub: MalaysiaProductHubDto
  readonly structuredData?: React.ReactNode
}) {
  const grades = productHub.directory.groups.flatMap((group) => group.grades)
  const processRoutes = productHub.process.routes.filter(
    (route) => productHub.routeReadiness[route.targetPageId],
  )
  const supportItems = productHub.support.items.filter(
    (item) => productHub.routeReadiness[item.targetPageId],
  )

  return (
    <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my">
      {structuredData}
      <MalaysiaGlobalHeader
        chrome={productHub.globalChrome}
        currentPageId="PRODUCT-000"
        sourcePageId="PRODUCT-000"
      />
      <main className={styles.productMain}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <ol>
            {productHub.breadcrumb.map((item, index) => (
              <li key={item.targetPageId}>
                {index === productHub.breadcrumb.length - 1
                  ? <span aria-current="page">{item.label}</span>
                  : <a href={item.href}>{item.label}</a>}
              </li>
            ))}
          </ol>
        </nav>

        <section className={`${styles.section} ${styles.hero}`} data-module="hero" aria-labelledby="product-hero-heading">
          <div className={styles.heroCopy}>
            <Eyebrow>{productHub.hero.eyebrow}</Eyebrow>
            <h1 id="product-hero-heading">{productHub.hero.h1}</h1>
            <p>{productHub.hero.intro}</p>
            <p>{productHub.hero.rutileStatement}</p>
            <p className={styles.qualification}>{productHub.hero.qualification}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href={productHub.hero.primaryAction.href}>{productHub.hero.primaryAction.label}</a>
              <a className={styles.outlineButton} href={productHub.hero.secondaryAction.href} data-site-scope="tio2-my" data-source-page="PRODUCT-000">
                {productHub.hero.secondaryAction.label}
              </a>
            </div>
          </div>
          <aside className={styles.portfolioSummary} aria-label={productHub.hero.summary.title}>
            <h2>{productHub.hero.summary.title}</h2>
            <p>{productHub.hero.summary.body}</p>
            <div>
              {productHub.hero.summary.items.map((item, index) => (
                <div key={item.label}>
                  <strong data-tone={index + 1}>{item.count}</strong><span>{item.label}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section id={productHub.selector.anchorId} className={`${styles.section} ${styles.selector}`} data-module="grade-selector" aria-labelledby="selector-heading">
          <SectionIntro eyebrow={productHub.selector.eyebrow} heading={productHub.selector.heading} intro={productHub.selector.intro} headingId="selector-heading" />
          <ProductSelector selector={productHub.selector} grades={grades} routeReadiness={productHub.routeReadiness} />
        </section>

        <section className={`${styles.section} ${styles.process}`} data-module="process" aria-labelledby="process-heading">
          <SectionIntro eyebrow={productHub.process.eyebrow} heading={productHub.process.heading} intro={productHub.process.intro} headingId="process-heading" />
          {processRoutes.length ? (
            <div className={styles.processGrid}>
              {processRoutes.map((route) => (
                <article key={route.targetPageId}>
                  <h3>{route.title}</h3><p>{route.body}</p>
                  <a data-process-route={route.targetPageId} href={route.href}>{route.actionLabel} <span aria-hidden="true">→</span></a>
                </article>
              ))}
            </div>
          ) : null}
          <div className={styles.specialRow}>
            <strong>{productHub.process.specialRow.gradeId}</strong>
            <span>{productHub.process.specialRow.classification}</span>
            {productHub.routeReadiness[productHub.process.specialRow.targetPageId] ? (
              <a aria-label={`View ${productHub.process.specialRow.gradeId} grade`} data-grade-action={productHub.process.specialRow.targetPageId} href={productHub.process.specialRow.href}>
                {productHub.process.specialRow.actionLabel} <span aria-hidden="true">→</span>
              </a>
            ) : null}
          </div>
        </section>

        <section className={`${styles.section} ${styles.directory}`} data-module="grade-directory" aria-labelledby="directory-heading">
          <SectionIntro eyebrow={productHub.directory.eyebrow} heading={productHub.directory.heading} intro={productHub.directory.intro} headingId="directory-heading" />
          <p className={styles.disambiguation}>{productHub.directory.disambiguation}</p>
          <div className={styles.directoryGrid}>
            {productHub.directory.groups.map((group) => (
              <article key={group.id}>
                <h3>{group.label} — {group.grades.length}</h3>
                <div>
                  {group.grades.map((grade) => (
                    <div key={grade.pageId}>
                      <strong>{grade.gradeId}</strong><p>{grade.summary}</p>
                      {productHub.routeReadiness[grade.pageId] ? (
                        <a aria-label={`View ${grade.gradeId} grade`} data-grade-action={grade.pageId} href={grade.href}>{productHub.directory.actionLabel} <span aria-hidden="true">→</span></a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.evaluation}`} data-module="evaluation" aria-labelledby="evaluation-heading">
          <SectionIntro eyebrow={productHub.evaluation.eyebrow} heading={productHub.evaluation.heading} intro={productHub.evaluation.intro} headingId="evaluation-heading" />
          <ol>
            {productHub.evaluation.items.map((item, index) => (
              <li key={item.title}>
                <span>{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {supportItems.length ? (
          <section className={`${styles.section} ${styles.support}`} data-module="support" aria-labelledby="support-heading">
            <div className={styles.sectionIntro}>
              <Eyebrow>{productHub.support.eyebrow}</Eyebrow>
              <h2 id="support-heading">{productHub.support.heading}</h2>
            </div>
            <div>
              {supportItems.map((item) => (
                <article key={item.targetPageId}>
                  <h3>{item.title}</h3><p>{item.body}</p>
                  <a data-support-action={item.targetPageId} href={item.href}>{item.actionLabel} <span aria-hidden="true">→</span></a>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={`${styles.section} ${styles.questions}`} data-module="buyer-questions" aria-labelledby="questions-heading">
          <Eyebrow>BUYER QUESTIONS</Eyebrow>
          <h2 id="questions-heading">Buyer Questions</h2>
          <ProductFaq questions={productHub.buyerQuestions} />
        </section>

        <section className={`${styles.section} ${styles.finalRfq}`} data-module="final-rfq" aria-labelledby="final-rfq-heading">
          <div>
            <Eyebrow>{productHub.finalRfq.eyebrow}</Eyebrow>
            <h2 id="final-rfq-heading">{productHub.finalRfq.heading}</h2>
            <p>{productHub.finalRfq.body}</p><small>{productHub.finalRfq.note}</small>
          </div>
          <a href={productHub.finalRfq.action.href} data-site-scope="tio2-my" data-source-page="PRODUCT-000">
            {productHub.finalRfq.action.label}
          </a>
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={productHub.globalChrome} sourcePageId="PRODUCT-000" />
    </div>
  )
}
