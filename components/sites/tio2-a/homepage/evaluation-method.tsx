import type {EditorialMethodStepDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface EvaluationMethodProps {
  readonly steps: readonly EditorialMethodStepDto[]
}

export function EvaluationMethod({steps}: EvaluationMethodProps) {
  return (
    <section
      className={`${styles.section} ${styles.methodSection}`}
      aria-labelledby="site-a-evaluation-method-heading"
    >
      <h2 id="site-a-evaluation-method-heading">Evaluation method</h2>
      <ol className={styles.methodList}>
        {steps.map((step) => (
          <li key={step.number}>
            <span className={styles.number} aria-hidden="true">
              {step.number}
            </span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
