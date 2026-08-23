import type {HomepageInquiryDto} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'

interface InquiryProcessProps {
  readonly inquiry: HomepageInquiryDto
}

export function InquiryProcess({inquiry}: InquiryProcessProps) {
  return (
    <section
      className={styles.editorialSection}
      aria-labelledby="homepage-inquiry-heading"
    >
      <div className={styles.sectionIntro}>
        <h2 id="homepage-inquiry-heading">{inquiry.heading}</h2>
      </div>
      <ol className={styles.stepGrid}>
        {inquiry.steps.map((step) => (
          <li key={step.number}>
            <span className={styles.stepNumber} aria-hidden="true">
              {String(step.number).padStart(2, '0')}
            </span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
