import type {ResourcePresentation} from '@/lib/resources/presentation'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import styles from './resource-page.module.css'

export function ResourceHero({
  resource,
  presentation,
}: {
  readonly resource: TechnicalResourcePageDto
  readonly presentation: ResourcePresentation
}): React.ReactNode {
  return (
    <>
      <section
        aria-labelledby="resource-hero-heading"
        className={`${styles.hero} ${styles.mediumWidth}`}
        data-resource-section="hero"
      >
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{resource.hero.eyebrow}</p>
          <p className={styles.resourceMeta}>{resource.identity.cluster}</p>
          <h1 id="resource-hero-heading">{resource.hero.headline}</h1>
          <div
            className={styles.heroAnswer}
            id="resource-direct-answer"
            dangerouslySetInnerHTML={{__html: resource.hero.directAnswer}}
          />
        </div>
        <dl aria-label="Page decision summary" className={styles.heroSummary}>
          {presentation.heroSummary.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <nav
        aria-label="Resource decision path"
        className={`${styles.decisionRail} ${styles.mediumWidth}`}
        data-resource-section="decision-rail"
      >
        <ol>
          {presentation.decisionSteps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {step}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
