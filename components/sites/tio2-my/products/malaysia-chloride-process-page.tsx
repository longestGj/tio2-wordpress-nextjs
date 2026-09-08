import type {ChlorideProcessAction, MalaysiaChlorideProcessPageDto} from '@/lib/wordpress/product-process-chloride-v01-types'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import {ChlorideGradeAnchor} from './chloride-grade-anchor'
import styles from './malaysia-chloride-process-page.module.css'

function actionHref(action: ChlorideProcessAction): string {
  if (!action.context) return action.href
  return `${action.href}?${new URLSearchParams({source_page_id: action.context.sourcePageId})}`
}

function Action({action}: {readonly action: ChlorideProcessAction}) {
  return (
    <span className={styles.action}>
      {action.href.startsWith('#')
        ? <ChlorideGradeAnchor label={action.label} />
        : <a
            href={actionHref(action)}
            data-site-scope={action.context ? 'tio2-my' : undefined}
            data-source-page={action.context?.sourcePageId}
          >{action.label}</a>}
    </span>
  )
}

export function MalaysiaChlorideProcessPage({page, structuredData}: {
  readonly page: MalaysiaChlorideProcessPageDto
  readonly structuredData?: React.ReactNode
}) {
  const [hero, processMeaning, directory, evaluation, finalRfq] = page.modules
  return (
    <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my" data-page-id="PRODUCT-PROC-CL">
      {structuredData}
      <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="PRODUCT-000" sourcePageId="PRODUCT-PROC-CL" />
      <main className={styles.main}>
        <section id="cl-01" className={`${styles.module} ${styles.hero}`} data-cl-module={hero.id} aria-labelledby="chloride-process-heading">
          <div className={styles.pageWidth}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb"><ol>{page.breadcrumb.map((item, index) => <li key={item.targetPageId}>{index === page.breadcrumb.length - 1 ? <span aria-current="page">{item.label}</span> : <a href={item.href}>{item.label}</a>}</li>)}</ol></nav>
            <p className={styles.eyebrow}>{hero.eyebrow}</p>
            <h1 id="chloride-process-heading">{hero.heading}</h1>
            <div className={styles.heroCopy}>{hero.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
            <div className={styles.actions}>{hero.actions.map(action => <Action key={action.targetPageId} action={action} />)}</div>
          </div>
        </section>

        <section id="cl-02" className={styles.module} data-cl-module={processMeaning.id} aria-labelledby="cl-02-heading">
          <div className={`${styles.pageWidth} ${styles.split}`}>
            <h2 id="cl-02-heading">{processMeaning.heading}</h2>
            <div>{processMeaning.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<Action action={processMeaning.actions[0]!} /></div>
          </div>
        </section>

        <section id="cl-03" className={styles.module} data-cl-module={directory.id} aria-labelledby="explore-chloride-process-grades">
          <div className={styles.pageWidth}>
            <h2 id="explore-chloride-process-grades" tabIndex={-1}>{directory.heading}</h2>
            <p className={styles.intro}>{directory.paragraphs[0]}</p>
            <ul className={styles.grades}>{page.grades.map(grade => <li key={grade.registeredPageId} className={styles.grade} data-grade-page-id={grade.registeredPageId}>
              <h3>{grade.gradeNameOrModelCode}</h3><p>{grade.summary}</p><span className={styles.action}><a href={grade.cleanUrl}>{grade.actionLabel}</a></span>
            </li>)}</ul>
          </div>
        </section>

        <section id="cl-04" className={styles.module} data-cl-module={evaluation.id} aria-labelledby="cl-04-heading">
          <div className={styles.pageWidth}>
            <h2 id="cl-04-heading">{evaluation.heading}</h2>
            <div className={styles.steps}>{evaluation.steps.map(step => <article key={step.heading} className={styles.step}><h3>{step.heading}</h3><p>{step.paragraph}</p></article>)}</div>
            <div className={styles.actions}>{evaluation.actions.map(action => <Action key={action.targetPageId} action={action} />)}</div>
          </div>
        </section>

        <section id="cl-05" className={`${styles.module} ${styles.final}`} data-cl-module={finalRfq.id} aria-labelledby="cl-05-heading">
          <div className={`${styles.pageWidth} ${styles.split}`}>
            <h2 id="cl-05-heading">{finalRfq.heading}</h2>
            <div>{finalRfq.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<Action action={finalRfq.actions[0]!} /></div>
          </div>
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="PRODUCT-PROC-CL" />
    </div>
  )
}
