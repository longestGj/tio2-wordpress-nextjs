import type {EditorialEvidenceItemDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface EvidenceLibraryProps {
  readonly evidenceItems: readonly EditorialEvidenceItemDto[]
}

export function EvidenceLibrary({evidenceItems}: EvidenceLibraryProps) {
  return (
    <section
      className={styles.section}
      aria-labelledby="site-a-evidence-library-heading"
    >
      <h2 id="site-a-evidence-library-heading">Evidence library</h2>
      <div className={styles.evidenceGrid}>
        {evidenceItems.map((item) => (
          <article key={`${item.documentType}:${item.title}`}>
            <p className={styles.documentType}>{item.documentType}</p>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <p className={styles.muted}>{item.applicability}</p>
            {item.revisionLabel ? <p>{item.revisionLabel}</p> : null}
            {item.evidenceUrl ? (
              <a href={item.evidenceUrl}>Review source document</a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
