import type {EditorialDecisionQuestionDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface DecisionFrameworkProps {
  readonly questions: readonly EditorialDecisionQuestionDto[]
}

export function DecisionFramework({questions}: DecisionFrameworkProps) {
  return (
    <section
      className={styles.section}
      aria-labelledby="site-a-decision-framework-heading"
    >
      <h2 id="site-a-decision-framework-heading">Decision framework</h2>
      <ol className={styles.numberedGrid}>
        {questions.map((question) => (
          <li key={question.number}>
            <article>
              <span className={styles.number} aria-hidden="true">
                {question.number}
              </span>
              <h3>{question.question}</h3>
              <p>{question.answer}</p>
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}
