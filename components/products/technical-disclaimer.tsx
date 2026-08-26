import styles from './product-page.module.css'

interface TechnicalDisclaimerProps {
  readonly disclaimerHtml: string
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
