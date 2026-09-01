import type {MalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-types'

import {
  MalaysiaGlobalFooter,
  MalaysiaGlobalHeader,
} from '../malaysia-global-chrome'
import styles from './malaysia-product-detail.module.css'

function actionHref(
  href: string,
  prefill: Readonly<Record<string, string>>,
): string {
  const query = new URLSearchParams(prefill)
  return `${href}?${query.toString()}`
}

function Kicker({children}: {readonly children: React.ReactNode}) {
  return <p className={styles.kicker}>{children}</p>
}

const applicationTargetLabels: Readonly<Record<string, string>> = {
  'APP-PLAS': 'Plastics application guidance',
  'APP-MB': 'Masterbatch application guidance',
}

export function MalaysiaProductDetail({
  product,
  structuredData,
}: {
  readonly product: MalaysiaProductDetailDto
  readonly structuredData?: React.ReactNode
}) {
  const {modules} = product
  const {gradeCode, pageId} = product.identity
  const titleSuffix = product.seo.h1.startsWith(`${gradeCode} `)
    ? product.seo.h1.slice(gradeCode.length + 1)
    : product.seo.h1
  const titleId = `${product.identity.slug}-title`
  const hasStandardColumn = modules.technical.columns.length === 3 &&
    modules.technical.rows.every((row) => typeof row.standard === 'string')
  const sectionLinks = [
    {id: 'positioning', label: 'Positioning'},
    {id: 'applications', label: 'Applications'},
    {id: 'evaluation', label: 'Evaluation'},
    {id: 'technical-data', label: 'Technical data'},
    ...(modules.documents ? [{id: 'documents', label: 'Documents'}] : []),
    ...(modules.markets ? [{id: 'markets', label: 'Markets'}] : []),
    ...(modules.relatedGrades ? [{id: 'related-grades', label: 'Related grades'}] : []),
    ...(modules.sample ? [{id: 'sample', label: 'Sample'}] : []),
  ]

  return (
    <div className={styles.productDetailSite} data-site-id="tio2-my" data-site-scope="tio2-my">
      {structuredData}
      <MalaysiaGlobalHeader
        chrome={product.globalChrome}
        currentPageId="PRODUCT-000"
        sourcePageId={pageId}
      />
      <main className={styles.productMain}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <ol>
            {product.breadcrumb.map((item, index) => (
              <li key={item.targetPageId}>
                {index === product.breadcrumb.length - 1
                  ? <span aria-current="page">{item.label}</span>
                  : <a href={item.href}>{item.label}</a>}
              </li>
            ))}
          </ol>
        </nav>

        <section className={styles.hero} data-module="hero" aria-labelledby={titleId}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <Kicker>{modules.hero.eyebrow}</Kicker>
              <h1 id={titleId}><span>{gradeCode}</span>{' '}{titleSuffix}</h1>
              <p><strong>{modules.hero.summaryLead}</strong> {modules.hero.summaryBody}</p>
              {modules.hero.actions.length ? (
                <div className={styles.heroActions}>
                  {modules.hero.actions.map((action, index) => (
                    <a
                      key={action.targetPageId}
                      className={index === 0 ? styles.primaryAction : styles.secondaryAction}
                      href={actionHref(action.href, action.prefill)}
                      data-contextual-action={action.targetPageId}
                      data-site-scope="tio2-my"
                      data-grade={gradeCode}
                      data-source-page={pageId}
                    >{action.label}</a>
                  ))}
                </div>
              ) : null}
              <ul className={styles.proofs} aria-label="Product review notes">
                {modules.hero.proofs.map((proof) => <li key={proof}>{proof}</li>)}
              </ul>
            </div>
            <div className={styles.productVisual} role="img" aria-label={modules.hero.visual.label}>
              <div className={`${styles.fileCard} ${styles.backCard}`}>
                <small>Technical product file</small><span>{gradeCode}</span><p>{modules.hero.visual.technicalFile}</p>
              </div>
              <div className={`${styles.fileCard} ${styles.frontCard}`}>
                <small>Current product data</small><span>{gradeCode}</span><p>{modules.hero.visual.currentData}</p>
              </div>
              <p>{modules.hero.visual.note}</p>
            </div>
          </div>
        </section>

        <section className={styles.facts} aria-label={`${gradeCode} product facts`} data-module="facts">
          <dl>
            {modules.hero.facts.map((fact) => (
              <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
            ))}
          </dl>
        </section>

        <nav className={styles.sectionNav} aria-label="On this page" data-module="section-navigation">
          <ul>{sectionLinks.map((link) => <li key={link.id}><a href={`#${link.id}`}>{link.label}</a></li>)}</ul>
        </nav>

        <section id="positioning" className={styles.section} data-module="positioning" aria-labelledby="positioning-heading">
          <div className={styles.positioningGrid}>
            <div>
              <Kicker>{modules.positioning.eyebrow}</Kicker>
              <h2 id="positioning-heading">{modules.positioning.heading}</h2>
              <p className={styles.directAnswer}><strong>{modules.positioning.lead}</strong> {modules.positioning.body}</p>
              {modules.positioning.contextualLink ? (
                <a className={styles.textAction} href={modules.positioning.contextualLink.href}>
                  {modules.positioning.contextualLink.label} <span aria-hidden="true">→</span>
                </a>
              ) : null}
            </div>
            <ol className={styles.decisionList}>
              {modules.positioning.decisionPoints.map((item, index) => (
                <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></li>
              ))}
            </ol>
          </div>
        </section>

        <section id="applications" className={`${styles.section} ${styles.soft}`} data-module="applications" aria-labelledby="applications-heading">
          <Kicker>{modules.applications.eyebrow}</Kicker>
          <h2 id="applications-heading">{modules.applications.heading}</h2>
          <p className={styles.sectionLead}>{modules.applications.intro}</p>
          <div className={styles.applicationGrid}>
            {modules.applications.items.map((item, index) => (
              <article key={item.title}>
                <small>{String(index + 1).padStart(2, '0')} · {item.category}</small>
                <h3>{item.href ? <a href={item.href}>{item.title}</a> : item.title}</h3><p>{item.body}</p>
                {item.relatedTargets?.length ? (
                  <ul className={styles.applicationLinks} aria-label={`${item.title} application pages`}>
                    {item.relatedTargets.map((target) => (
                      <li key={target.targetPageId}>
                        <a href={target.href}>{applicationTargetLabels[target.targetPageId] ?? item.title}</a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section id="evaluation" className={styles.section} data-module="evaluation" aria-labelledby="evaluation-heading">
          <Kicker>{modules.evaluation.eyebrow}</Kicker>
          <h2 id="evaluation-heading">{modules.evaluation.heading}</h2>
          <p className={styles.sectionLead}>{modules.evaluation.intro}</p>
          <div className={styles.evaluationGrid}>
            {modules.evaluation.groups.map((group) => (
              <article key={group.heading}><h3>{group.heading}</h3><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></article>
            ))}
          </div>
          <p className={styles.disclaimer}>{modules.evaluation.disclaimer}</p>
        </section>

        <section id="technical-data" className={`${styles.section} ${styles.soft}`} data-module="technical" aria-labelledby="technical-heading">
          <div className={styles.technicalHeading}>
            <div><Kicker>{modules.technical.eyebrow}</Kicker><h2 id="technical-heading">{modules.technical.heading}</h2><p className={styles.sectionLead}>{modules.technical.intro}</p></div>
            <p className={styles.sourceChip}>{modules.technical.sourceLabel}</p>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <caption className={styles.srOnly}>{gradeCode} typical technical data with {modules.technical.columns.join(', ')}</caption>
              <thead><tr>{modules.technical.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
              <tbody>
                {modules.technical.rows.map((row) => (
                  <tr key={row.property}>
                    <th scope="row">{row.property}</th>
                    {hasStandardColumn ? <td data-label={modules.technical.columns[1]}>{row.standard}</td> : null}
                    <td data-label={modules.technical.columns.at(-1)}>{row.typical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.technicalNote}>{modules.technical.note}</p>
          {modules.technical.action ? (
            <a className={styles.textAction} href={actionHref(modules.technical.action.href, modules.technical.action.prefill)} data-contextual-action={modules.technical.action.targetPageId}>
              {modules.technical.action.label} <span aria-hidden="true">→</span>
            </a>
          ) : null}
        </section>

        {modules.documents ? (
          <section id="documents" className={`${styles.section} ${styles.documents}`} data-module="documents" aria-labelledby="documents-heading">
            <div><Kicker>{modules.documents.eyebrow}</Kicker><h2 id="documents-heading">{modules.documents.heading}</h2><p>{modules.documents.intro}</p><a href={actionHref(modules.documents.href, modules.documents.prefill)} data-contextual-action={modules.documents.targetPageId}>{modules.documents.actionLabel}</a><small>{modules.documents.availability}</small></div>
            <div>{modules.documents.options.map((option) => <article key={option.title}><h3>{option.title}</h3><p>{option.body}</p></article>)}</div>
          </section>
        ) : null}

        {modules.markets ? (
          <section id="markets" className={`${styles.section} ${styles.soft}`} data-module="markets" aria-labelledby="markets-heading">
            <Kicker>{modules.markets.eyebrow}</Kicker><h2 id="markets-heading">{modules.markets.heading}</h2><p className={styles.sectionLead}>{modules.markets.intro}</p>
            <div className={styles.marketGrid}>{modules.markets.items.map((item) => <a key={item.targetPageId} href={item.href}>{item.label}<span aria-hidden="true">↗</span></a>)}</div>
            <p className={styles.technicalNote}>{modules.markets.note}</p>
          </section>
        ) : null}

        {modules.relatedGrades ? (
          <section id="related-grades" className={styles.section} data-module="related-grades" aria-labelledby="related-heading">
            <Kicker>{modules.relatedGrades.eyebrow}</Kicker><h2 id="related-heading">{modules.relatedGrades.heading}</h2><p className={styles.sectionLead}>{modules.relatedGrades.intro}</p>
            <div className={styles.relatedGrid}>{modules.relatedGrades.items.map((item) => <article key={item.targetPageId}><small>Related grade</small><h3>{item.gradeCode}</h3><p>{item.body}</p><a href={item.href}>View {item.gradeCode} <span aria-hidden="true">→</span></a></article>)}</div>
            <p className={styles.technicalNote}>{modules.relatedGrades.note}</p>
            {modules.relatedGrades.allHref ? <a className={styles.textAction} href={modules.relatedGrades.allHref}>{modules.relatedGrades.allLabel} <span aria-hidden="true">→</span></a> : null}
          </section>
        ) : null}

        {modules.sample ? (
          <section id="sample" className={`${styles.section} ${styles.sample}`} data-module="sample" aria-labelledby="sample-heading">
            <div><Kicker>{modules.sample.eyebrow}</Kicker><h2 id="sample-heading">{modules.sample.heading}</h2><p>{modules.sample.body}</p></div>
            <a href={actionHref(modules.sample.href, modules.sample.prefill)} data-contextual-action={modules.sample.targetPageId}>{modules.sample.actionLabel}</a>
          </section>
        ) : null}
      </main>
      <MalaysiaGlobalFooter chrome={product.globalChrome} sourcePageId={pageId} />
    </div>
  )
}
