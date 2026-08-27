import styles from './product-page.module.css'

interface PackagingDocumentsProps {
  readonly packaging: string
  readonly tdsAccess: string
}

export function PackagingDocuments({
  packaging,
  tdsAccess,
}: PackagingDocumentsProps) {
  return (
    <section
      className={styles.section}
      data-product-section="packaging-documents"
      aria-labelledby="product-packaging-documents-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Supply review</p>
        <h2 id="product-packaging-documents-heading">
          Packaging and Documents
        </h2>
      </div>
      <div className={styles.packagingGrid}>
        <article className={styles.contentCard}>
          <h3>Packaging</h3>
          <p>{packaging}</p>
        </article>
        <article className={`${styles.contentCard} ${styles.documentCard}`}>
          <h3>Technical data sheet</h3>
          <p>{tdsAccess}</p>
          <p className={styles.requestOnlyNote}>
            Documents are supplied on request so the current grade and
            application context can be confirmed.
          </p>
        </article>
      </div>
    </section>
  )
}
