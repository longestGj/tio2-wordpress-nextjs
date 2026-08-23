import type {HomepageRfqDto} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'
import {RfqForm} from './rfq-form'

interface RfqSectionProps {
  readonly rfq: HomepageRfqDto
}

export function RfqSection({rfq}: RfqSectionProps) {
  return (
    <section
      className={styles.rfqSection}
      id="rfq"
      tabIndex={-1}
      aria-labelledby="homepage-rfq-heading"
    >
      <div className={styles.rfqIntro}>
        <h2 id="homepage-rfq-heading">{rfq.heading}</h2>
        <p>{rfq.intro}</p>
      </div>
      <RfqForm rfq={rfq} />
    </section>
  )
}
