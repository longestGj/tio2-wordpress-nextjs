import type {ProductPageDto} from '@/lib/products/types'
import type {ProductDetailPageDto} from '@/lib/products/page-types'

import detail from './product-detail.module.css'
import styles from './product-page.module.css'

interface ValidationGuideProps {
  readonly checklist: ProductPageDto['validationChecklist']
}

export function ValidationGuideV05({
  copy,
  steps,
}: {
  readonly copy: ProductDetailPageDto['presentation']['validation']
  readonly steps: ProductDetailPageDto['validationSteps']
}): React.ReactNode {
  return (
    <section
      aria-labelledby="detail-validation-heading"
      className={`${detail.section} ${detail.wrap}`}
      data-product-section="validation-method"
    >
      <div className={detail.sectionHead}>
        <p className={detail.eyebrow}>{copy.eyebrow}</p>
        <h2 id="detail-validation-heading">{copy.heading}</h2>
      </div>
      <ol className={detail.validationGrid}>
        {steps.map((step) => (
          <li data-validation-step key={`${step.index}-${step.title}`}>
            <span aria-hidden="true">{step.index}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function ValidationGuide({checklist}: ValidationGuideProps) {
  if (checklist.length === 0) return null

  return (
    <section
      className={styles.section}
      data-product-section="validation-guide"
      aria-labelledby="product-validation-guide-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Customer testing</p>
        <h2 id="product-validation-guide-heading">Validation Guide</h2>
      </div>
      <ol className={styles.checklist}>
        {checklist.map((item, index) => (
          <li className={styles.checklistItem} key={`${index}-${item}`}>
            <span className={styles.checklistNumber} aria-hidden="true">
              {index + 1}
            </span>
            <p>{item}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
