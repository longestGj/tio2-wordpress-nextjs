import type {HomepageTrustDto} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'

interface SupplierTrustProps {
  readonly trust: HomepageTrustDto
}

export function SupplierTrust({trust}: SupplierTrustProps) {
  return (
    <section
      className={`${styles.editorialSection} ${styles.trustSection}`}
      aria-labelledby="homepage-trust-heading"
    >
      <div className={styles.sectionIntro}>
        <h2 id="homepage-trust-heading">{trust.heading}</h2>
        <p>{trust.intro}</p>
      </div>
      <div className={styles.trustGrid}>
        {trust.reasons.map((reason) => (
          <article key={reason.title}>
            <h3>{reason.title}</h3>
            <p>{reason.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
