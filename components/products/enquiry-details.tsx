import type {ProductPageDto} from '@/lib/products/types'

import styles from './product-page.module.css'

interface EnquiryDetailsProps {
  readonly fields: ProductPageDto['enquiryFields']
}

export function EnquiryDetails({fields}: EnquiryDetailsProps) {
  return (
    <section
      className={`${styles.section} ${styles.softSection}`}
      data-product-section="enquiry-details"
      aria-labelledby="product-enquiry-details-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Prepare an efficient review</p>
        <h2 id="product-enquiry-details-heading">Details to Share With Us</h2>
      </div>
      <dl className={styles.enquiryGrid}>
        {fields.map((field) => (
          <div className={styles.enquiryCard} key={field.key}>
            <dt>{field.label}</dt>
            <dd>{field.guidance}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
