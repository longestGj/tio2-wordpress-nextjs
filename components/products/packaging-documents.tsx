import type {ProductDetailPageDto} from '@/lib/products/page-types'

import detail from './product-detail.module.css'
import {ProductCtaV05} from './product-cta'
import styles from './product-page.module.css'

interface PackagingDocumentsProps {
  readonly packaging: string
  readonly tdsAccess: string
}

export function PackagingDocumentsV05({
  copy,
  enquiry,
}: {
  readonly copy: ProductDetailPageDto['presentation']['enquiryPreparation']
  readonly enquiry: ProductDetailPageDto['enquiryPreparation']
}): React.ReactNode {
  return (
    <section
      aria-labelledby="detail-enquiry-preparation-heading"
      className={`${detail.section} ${detail.wrap}`}
      data-product-section="enquiry-preparation"
    >
      <div className={detail.sectionHead}>
        <p className={detail.eyebrow}>{copy.eyebrow}</p>
        <h2 id="detail-enquiry-preparation-heading">{copy.heading}</h2>
        <p className={detail.sectionIntro}>{copy.intro}</p>
      </div>
      <div className={detail.enquiryGrid}>
        <article>
          <h3>{copy.itemsHeading}</h3>
          <ul className={detail.enquiryItems}>
            {enquiry.items.map((item) => (
              <li data-enquiry-item key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article>
          <h3>{copy.documentsHeading}</h3>
          <p>{enquiry.packaging}</p>
          <p>{enquiry.tdsAccess}</p>
          <ProductCtaV05 ctas={enquiry.ctas} placement="enquiry" />
        </article>
      </div>
    </section>
  )
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
