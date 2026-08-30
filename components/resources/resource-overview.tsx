import type {ResourceGuideItem} from '@/lib/resources/presentation'

import styles from './resource-page.module.css'

export function ResourceOverview({
  guideItems,
  keyTakeaways,
}: {
  readonly guideItems: readonly ResourceGuideItem[]
  readonly keyTakeaways: readonly string[]
}): React.ReactNode {
  if (guideItems.length !== 6) return null

  return (
    <section
      aria-labelledby="resource-key-conclusions-heading"
      className={`${styles.overview} ${styles.mediumWidth}`}
      data-resource-section="overview"
    >
      <div className={styles.overviewGrid}>
        <nav aria-label="In this guide" className={styles.guideNavigation}>
          <strong>In this guide</strong>
          <ol>
            {guideItems.map((item, index) => (
              <li key={item.targetId}>
                <a href={`#${item.targetId}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {' '}
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className={styles.keyConclusions}>
          <p>Key conclusions</p>
          <h2 id="resource-key-conclusions-heading">Plan the comparison</h2>
          <ul>
            {keyTakeaways.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
          <p className={styles.overviewGuidance}>
            Use the page as a planning guide. Confirm results in the intended
            formulation, process and finished product.
          </p>
        </div>
      </div>
    </section>
  )
}
