import type {ProductPageDto} from '@/lib/products/types'
import type {ProductDetailPageDto} from '@/lib/products/page-types'

import detail from './product-detail.module.css'
import styles from './product-page.module.css'

interface ProductSnapshotProps {
  readonly snapshot: ProductPageDto['snapshot']
}

export function ProductSnapshot({snapshot}: ProductSnapshotProps) {
  const snapshotItems = [
    ['Product type', snapshot.productType],
    ['Process', snapshot.process],
    ['Primary application', snapshot.primaryApplication],
    ['Positioning', snapshot.positioning],
    ['Surface treatment', snapshot.surfaceTreatment],
  ].filter((item): item is [string, string] => item[1].length > 0)

  return (
    <section
      className={`${styles.section} ${styles.snapshotSection}`}
      data-product-section="snapshot"
      aria-labelledby="product-snapshot-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Product identity</p>
        <h2 id="product-snapshot-heading">Product Snapshot</h2>
      </div>
      <dl className={styles.snapshotGrid}>
        {snapshotItems.map(([label, value]) => (
          <div className={styles.definitionItem} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ProductSnapshotV05({
  copy,
  items,
}: {
  readonly copy: ProductDetailPageDto['presentation']['snapshot']
  readonly items: ProductDetailPageDto['snapshot']
}): React.ReactNode {
  return (
    <section
      aria-labelledby="detail-snapshot-heading"
      className={`${detail.section} ${detail.wrap}`}
      data-product-section="product-snapshot"
    >
      <div className={detail.sectionHead}>
        <p className={detail.eyebrow}>{copy.eyebrow}</p>
        <h2 id="detail-snapshot-heading">{copy.heading}</h2>
      </div>
      <dl className={detail.snapshotGrid}>
        {items.map((item) => (
          <div className={detail.snapshotItem} key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
