import {
  RESOURCE_HUB_CARD_SUMMARY_BY_ID,
  RESOURCE_LEARNING_PATHS,
  resolveResourcePresentation,
} from '@/lib/resources/presentation'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import styles from './resource-page.module.css'

const modeLabel = {
  'technical-explainer': 'Technical explainer',
  'evaluation-guide': 'Evaluation guide',
} as const

export function ResourceLearningPaths({
  links,
}: {
  readonly links: TechnicalResourcePageDto['children']
}): React.ReactNode {
  const childrenById = new Map(links.map((child) => [child.id, child]))

  return (
    <section
      aria-labelledby="resource-learning-paths-heading"
      className={`${styles.learningPaths} ${styles.fullWidth}`}
      data-resource-section="learning-paths"
    >
      <p className={styles.eyebrow}>Paths to a guided decision</p>
      <h2 id="resource-learning-paths-heading">Technical learning paths</h2>
      <div className={styles.learningPathList}>
        {RESOURCE_LEARNING_PATHS.map((path, pathIndex) => (
          <section
            aria-labelledby={`resource-learning-path-${path.id}-heading`}
            className={styles.learningPath}
            data-resource-learning-path={path.id}
            key={path.id}
          >
            <div className={styles.learningPathIntro}>
              <p className={styles.sectionIndex}>
                {`Path ${String(pathIndex + 1).padStart(2, '0')}`}
              </p>
              <h3 id={`resource-learning-path-${path.id}-heading`}>{path.label}</h3>
              <p>{path.intro}</p>
            </div>
            <ol className={styles.learningCards}>
              {path.articleIds.map((articleId, articleIndex) => {
                const child = childrenById.get(articleId)
                const presentation = resolveResourcePresentation(articleId)
                const summary = RESOURCE_HUB_CARD_SUMMARY_BY_ID[articleId]
                if (!child || !presentation || !summary || presentation.mode === 'hub') {
                  return null
                }
                const content = (
                  <>
                    <span className={styles.cardIndex}>
                      {String(articleIndex + 1).padStart(2, '0')}
                    </span>
                    <span className={styles.cardMode}>{modeLabel[presentation.mode]}</span>
                    <h4>{child.title}</h4>
                    <p>{summary}</p>
                    <span className={styles.cardAction}>View guide →</span>
                  </>
                )
                return (
                  <li data-resource-card={articleId} key={articleId}>
                    {child.href ? (
                      <a href={child.href}>{content}</a>
                    ) : (
                      <div>{content}</div>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </section>
  )
}
