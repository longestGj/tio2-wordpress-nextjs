import type {ProductDetailPageDto} from '@/lib/products/page-types'

import detail from './product-detail.module.css'
import styles from './product-page.module.css'

interface TechnicalDisclaimerProps {
  readonly disclaimerHtml: string
}

export function TechnicalDisclaimerV05({
  disclaimerHtml,
  label,
}: {
  readonly disclaimerHtml: string
  readonly label: ProductDetailPageDto['presentation']['disclaimerLabel']
}): React.ReactNode {
  return (
    <section
      aria-labelledby="detail-disclaimer-heading"
      className={detail.disclaimer}
      data-product-section="technical-disclaimer"
    >
      <div className={`${detail.wrap} ${detail.disclaimerInner}`}>
        <h2 id="detail-disclaimer-heading">{label}</h2>
        <div dangerouslySetInnerHTML={{__html: disclaimerHtml}} />
      </div>
    </section>
  )
}

export function TechnicalDisclaimer({
  disclaimerHtml,
}: TechnicalDisclaimerProps) {
  return (
    <section
      className={`${styles.section} ${styles.disclaimer}`}
      data-product-section="technical-disclaimer"
      aria-labelledby="product-technical-disclaimer-heading"
    >
      <div className={styles.disclaimerInner}>
        <h2 id="product-technical-disclaimer-heading">
          Technical Disclaimer
        </h2>
        <div
          className={styles.richText}
          dangerouslySetInnerHTML={{__html: disclaimerHtml}}
        />
      </div>
    </section>
  )
}
