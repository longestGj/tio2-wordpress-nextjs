import Image from 'next/image'

import {resolveVisibleMalaysiaResourceProcArticleMetadata} from '@/lib/resources/malaysia-resource-proc-article'
import type {
  MalaysiaResourceProcDto,
  MalaysiaResourceProcEligibleRelation,
} from '@/lib/wordpress/resource-proc-v01-types'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-resource-proc-page.module.css'
import {ResourceProcFaq} from './resource-proc-faq'

function relationMap(relations: readonly MalaysiaResourceProcEligibleRelation[]) {
  return new Map(relations.map((relation) => [relation.relationKey, relation] as const))
}

function Action({
  label,
  relation,
  secondary = false,
  marker,
}: {
  readonly label: string
  readonly relation?: MalaysiaResourceProcEligibleRelation
  readonly secondary?: boolean
  readonly marker?: 'products' | 'process'
}) {
  return relation ? (
    <a
      className={secondary ? styles.secondaryAction : styles.primaryAction}
      href={relation.href}
      data-products-action={marker === 'products' ? '' : undefined}
      data-process-action={marker === 'process' ? '' : undefined}
    >{label}</a>
  ) : null
}

export function MalaysiaResourceProcPage({
  page,
  structuredData,
}: {
  readonly page: MalaysiaResourceProcDto
  readonly structuredData?: React.ReactNode
}) {
  const relations = relationMap(page.eligibleRelations)
  const sources = new Map(page.externalSources.map((source) => [source.sourceKey, source] as const))
  const articleMetadata = resolveVisibleMalaysiaResourceProcArticleMetadata(
    page.schemaMode,
    page.articleMetadata,
  )
  return (
    <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my">
      {structuredData}
      <div className={styles.chromeModule} data-res-proc-module="GLOBAL_HEADER">
        <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="RES-000" sourcePageId="RES-PROC" />
      </div>
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-res-proc-module="BREADCRUMB">
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

        <section className={styles.hero} data-res-proc-module="HERO" aria-labelledby="res-proc-heading">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{page.hero.eyebrow}</p>
              <h1 id="res-proc-heading">{page.hero.h1}</h1>
              <p>{page.hero.supportingCopy}</p>
              {articleMetadata ? (
                <aside className={styles.articleMetadata} aria-label="Article information" data-res-proc-article-metadata>
                  <div className={styles.articlePublisher}>
                    <Image
                      src={articleMetadata.publisherLogoAssetKey}
                      alt={`${articleMetadata.publisherName} publisher logo`}
                      width={900}
                      height={300}
                    />
                    <span>Published by <strong>{articleMetadata.publisherName}</strong></span>
                  </div>
                  <dl>
                    <div><dt>Author</dt><dd>{articleMetadata.authorName}</dd></div>
                    <div><dt>Published</dt><dd><time dateTime={articleMetadata.datePublished}>{articleMetadata.datePublished}</time></dd></div>
                    <div><dt>Updated</dt><dd><time dateTime={articleMetadata.dateModified}>{articleMetadata.dateModified}</time></dd></div>
                    <div><dt>Last reviewed</dt><dd><time dateTime={articleMetadata.lastReviewedAt}>{articleMetadata.lastReviewedAt}</time></dd></div>
                    <div><dt>Maintained by</dt><dd>{articleMetadata.maintenanceOwner}</dd></div>
                  </dl>
                </aside>
              ) : null}
              <a className={styles.primaryAction} href={page.hero.jumpAction.href}>{page.hero.jumpAction.label}</a>
            </div>
            <aside className={styles.decisionPanel} aria-label="Buyer decision path">
              <div>Buyer decision path <span>4 steps</span></div>
              <ol>
                {page.hero.decisionPath.map((item, index) => (
                  <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>
                ))}
              </ol>
            </aside>
          </div>
        </section>

        <section className={`${styles.sectionWide} ${styles.directAnswer}`} data-res-proc-module="DIRECT_ANSWER" aria-label="The short answer">
          <div className={styles.directAnswerInner}>
            <p className={styles.eyebrow}>{page.directAnswer.eyebrow}</p>
            <div>
              <p className={styles.lead}>{page.directAnswer.answer}</p>
              <p className={styles.supporting}>{page.directAnswer.supportingSentence}</p>
            </div>
          </div>
        </section>

        <nav className={styles.onThisPage} data-res-proc-module="ON_THIS_PAGE" aria-labelledby="on-this-page-heading">
          <div>
            <h2 id="on-this-page-heading">{page.onThisPage.heading}</h2>
            <ol>
              {page.onThisPage.items.map((item) => (
                <li key={item.targetAnchor}><a href={`#${item.targetAnchor}`}>{item.label}</a></li>
              ))}
            </ol>
          </div>
        </nav>

        <section id="route-difference" className={styles.section} data-res-proc-module="ROUTE_DIFFERENCE" aria-labelledby="route-difference-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{page.routeDifference.eyebrow}</p>
            <h2 id="route-difference-heading">{page.routeDifference.heading}</h2>
            <p>{page.routeDifference.introduction}</p>
          </div>
          <div className={styles.routeGrid}>
            {page.routeDifference.routeCards.map((route) => (
              <article key={route.key} data-route-key={route.key}>
                <p className={styles.routeLabel}>{route.label}</p>
                <h3>{route.heading}</h3>
                <p className={styles.flowLabel}>{route.flowLabel}</p>
                <p>{route.body}</p>
              </article>
            ))}
          </div>
          <aside className={styles.qualifier}>{page.routeDifference.sharedQualifier}</aside>
        </section>

        <section id="label-limit" className={`${styles.sectionWide} ${styles.labelLimit}`} data-res-proc-module="LABEL_LIMIT" aria-labelledby="label-limit-heading">
          <div className={styles.labelLimitInner}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>{page.labelLimit.eyebrow}</p>
              <h2 id="label-limit-heading">{page.labelLimit.heading}</h2>
              <p>{page.labelLimit.introduction}</p>
            </div>
            <div className={styles.boundaryGrid}>
              <article><h3>{page.labelLimit.canIndicateHeading}</h3><ul>{page.labelLimit.canIndicate.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3>{page.labelLimit.cannotEstablishHeading}</h3><ul>{page.labelLimit.cannotEstablish.map((item) => <li key={item}>{item}</li>)}</ul></article>
            </div>
            <p className={styles.commercialBoundary}>{page.labelLimit.commercialBoundary}</p>
            <p className={styles.bridge}>{page.labelLimit.bridge}</p>
          </div>
        </section>

        <section id="grade-evidence" className={styles.section} data-res-proc-module="GRADE_EVIDENCE" aria-labelledby="grade-evidence-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{page.gradeEvidence.eyebrow}</p>
            <h2 id="grade-evidence-heading">{page.gradeEvidence.heading}</h2>
            <p>{page.gradeEvidence.introduction}</p>
          </div>
          <ol className={styles.evidenceLedger} aria-label="Grade-level evidence comparison framework">
            {page.gradeEvidence.rows.map((row) => (
              <li key={row.question} data-grade-evidence-record>
                <h3 data-grade-question>{row.question}</h3>
                <div data-grade-evidence><strong>Evidence to compare</strong><p>{row.evidence}</p></div>
                <div data-grade-interpretation><strong>Interpretation boundary</strong><p>{row.interpretation}</p></div>
              </li>
            ))}
          </ol>
          <p className={styles.tableNote}>{page.gradeEvidence.tableNote}</p>
        </section>

        <section className={`${styles.sectionWide} ${styles.application}`} data-res-proc-module="APPLICATION_OVERLAP" aria-labelledby="application-overlap-heading">
          <div className={styles.applicationInner}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>{page.applicationOverlap.eyebrow}</p>
              <h2 id="application-overlap-heading">{page.applicationOverlap.heading}</h2>
            </div>
            {page.applicationOverlap.evidenceAvailable ? (
              <div className={styles.applicationEvidence}>
                <p className={styles.applicationAnswer}>{page.applicationOverlap.answer}</p>
                <ul>
                  {page.applicationOverlap.evidenceItems.map((item) => <li key={item.sourceKey}>{item.statement}</li>)}
                </ul>
                <p>{page.applicationOverlap.evidenceLimit}</p>
                <div className={styles.sourceActions}>
                  {page.applicationOverlap.sourceActions.map((action) => {
                    const source = sources.get(action.sourceKey)
                    return source ? <a key={action.sourceKey} href={source.approvedUrl} target="_blank" rel="noopener noreferrer" data-application-source={action.sourceKey}>{action.label}</a> : null
                  })}
                </div>
              </div>
            ) : <p className={styles.evidenceUnavailable}>The supporting evidence for this section is not currently available.</p>}
          </div>
        </section>

        <section id="qualification-workflow" className={styles.section} data-res-proc-module="QUALIFICATION_WORKFLOW" aria-labelledby="qualification-workflow-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{page.qualificationWorkflow.eyebrow}</p>
            <h2 id="qualification-workflow-heading">{page.qualificationWorkflow.heading}</h2>
            <p>{page.qualificationWorkflow.introduction}</p>
          </div>
          <ol className={styles.workflowSteps}>
            {page.qualificationWorkflow.steps.map((step) => (
              <li key={step.number}><span>{step.number}</span><div><h3>{step.heading}</h3><p>{step.body}</p></div></li>
            ))}
          </ol>
          <div className={styles.outcomeGrid}>
            {page.qualificationWorkflow.outcomes.map((outcome) => <article key={outcome.heading}><h3>{outcome.heading}</h3><p>{outcome.body}</p></article>)}
          </div>
        </section>

        <section id="buyer-questions" className={`${styles.sectionWide} ${styles.questions}`} data-res-proc-module="BUYER_QUESTIONS" aria-labelledby="buyer-questions-heading">
          <div className={styles.questionsInner}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>{page.buyerQuestions.eyebrow}</p>
              <h2 id="buyer-questions-heading">{page.buyerQuestions.heading}</h2>
            </div>
            <ResourceProcFaq questions={page.buyerQuestions.items} />
          </div>
        </section>

        <section className={styles.section} data-res-proc-module="SOURCES" aria-labelledby="sources-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{page.sources.eyebrow}</p>
            <h2 id="sources-heading">{page.sources.heading}</h2>
            <p>{page.sources.introduction}</p>
            <p className={styles.reviewDate}>Sources reviewed: <time dateTime={page.sources.visibleReviewDate}>{page.sources.visibleReviewDate}</time></p>
          </div>
          <div className={styles.sourceGroups}>
            {page.sources.groups.map((group) => (
              <article key={group.key}><h3>{group.authority}</h3><p>{group.sourceTitles.join('; ')}</p><p>{group.useOnPage}</p><p className={styles.sourceDate}>{group.date}</p></article>
            ))}
          </div>
          <ul className={styles.externalSources}>
            {page.externalSources.map((source) => (
              <li key={source.sourceKey}>
                <a href={source.approvedUrl} target="_blank" rel="noopener noreferrer" data-external-source={source.sourceKey}>{source.approvedLabel}</a>
              </li>
            ))}
          </ul>
          <p className={styles.sourceNote}>{page.sources.sourceNote}</p>
        </section>

        <section className={styles.finalAction} data-res-proc-module="FINAL_ACTION" aria-labelledby="final-action-heading">
          <div className={styles.finalActionInner}>
            <div>
              <p className={styles.eyebrow}>{page.finalAction.eyebrow}</p>
              <h2 id="final-action-heading">{page.finalAction.heading}</h2>
              <p>{page.finalAction.body}</p>
            </div>
            <div className={styles.actions}>
              <Action label={page.finalAction.productsAction.label} relation={relations.get(page.finalAction.productsAction.relationKey)} marker="products" />
              {page.finalAction.processActions.map((action) => (
                <Action key={action.relationKey} label={action.label} relation={relations.get(action.relationKey)} secondary marker="process" />
              ))}
            </div>
          </div>
        </section>
      </main>
      <div className={styles.chromeModule} data-res-proc-module="GLOBAL_FOOTER">
        <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="RES-PROC" />
      </div>
    </div>
  )
}
