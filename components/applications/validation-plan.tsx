import type {ApplicationPageDto} from '@/lib/applications/types'

import styles from './application-page.module.css'

type DecisionGuide = ApplicationPageDto['decisionGuide']

export function ValidationPlan({guide}: {readonly guide: DecisionGuide}) {
  return (
    <section
      id="validation"
      className={`${styles.section} ${styles.wrap} ${styles.validationSection}`}
      data-application-section="validation-plan"
      aria-labelledby="application-validation-plan-heading"
    >
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>Validation method</p>
        <h2 id="application-validation-plan-heading">
          Move from pigment identity to finished-product evidence
        </h2>
      </div>
      <ol>
        {guide.validationPlan.map((item, index) => (
          <li key={`${index}-${item}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{item}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
