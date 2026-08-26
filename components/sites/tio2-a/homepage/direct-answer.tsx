import type {SiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface DirectAnswerProps {
  readonly directAnswer: SiteAEditorialHomepageDto['directAnswer']
}

export function DirectAnswer({directAnswer}: DirectAnswerProps) {
  return (
    <section
      className={`${styles.section} ${styles.directAnswer}`}
      aria-labelledby="site-a-direct-answer-heading"
    >
      <h2 id="site-a-direct-answer-heading">{directAnswer.question}</h2>
      <div className={styles.directAnswerCopy}>
        <p className={styles.lead}>{directAnswer.lead}</p>
        <p>{directAnswer.body}</p>
      </div>
    </section>
  )
}
