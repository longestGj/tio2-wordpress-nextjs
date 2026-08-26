import type {EditorialApplicationBriefDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface ApplicationBriefsProps {
  readonly briefs: readonly EditorialApplicationBriefDto[]
}

export function ApplicationBriefs({briefs}: ApplicationBriefsProps) {
  return (
    <section
      className={`${styles.section} ${styles.softSection}`}
      aria-labelledby="site-a-application-briefs-heading"
    >
      <h2 id="site-a-application-briefs-heading">Application briefs</h2>
      <div className={styles.applicationGrid}>
        {briefs.map((brief) => (
          <article key={brief.name}>
            <h3>{brief.name}</h3>
            <p>{brief.summary}</p>
            <p className={styles.muted}>{brief.considerations}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
