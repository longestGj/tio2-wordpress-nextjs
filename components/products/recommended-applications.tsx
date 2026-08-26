import type {ProductPageDto} from '@/lib/products/types'

import styles from './product-page.module.css'

interface RecommendedApplicationsProps {
  readonly applications: ProductPageDto['recommendedApplications']
}

export function RecommendedApplications({
  applications,
}: RecommendedApplicationsProps) {
  return (
    <section
      className={styles.section}
      data-product-section="recommended-applications"
      aria-labelledby="product-recommended-applications-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Where to evaluate</p>
        <h2 id="product-recommended-applications-heading">
          Recommended Applications
        </h2>
      </div>
      <ul className={styles.applicationGrid}>
        {applications.map((application, index) => (
          <li
            className={styles.applicationCard}
            key={`${index}-${application.title}`}
          >
            <article>
              <h3>
                {application.href ? (
                  <a href={application.href}>{application.title}</a>
                ) : (
                  application.title
                )}
              </h3>
              <p className={styles.applicationFit}>{application.fit}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
