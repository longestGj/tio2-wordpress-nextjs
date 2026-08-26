import styles from './product-page.module.css'

interface ProductEvidenceProps {
  readonly evidenceHtml: string
}

export function ProductEvidence({evidenceHtml}: ProductEvidenceProps) {
  return (
    <section
      className={`${styles.section} ${styles.evidenceSection}`}
      data-product-section="product-evidence"
      aria-labelledby="product-evidence-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Evidence boundary</p>
        <h2 id="product-evidence-heading">Product Evidence</h2>
      </div>
      <div
        className={`${styles.richText} ${styles.evidenceCopy}`}
        dangerouslySetInnerHTML={{__html: evidenceHtml}}
      />
    </section>
  )
}
