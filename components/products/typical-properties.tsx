import type {ProductPageDto} from '@/lib/products/types'
import type {ProductDetailPageDto} from '@/lib/products/page-types'

import {ProductCta, ProductCtaV05} from './product-cta'
import detail from './product-detail.module.css'
import styles from './product-page.module.css'

interface TypicalPropertiesProps {
  readonly ctas: ProductPageDto['ctas']
  readonly productId: string
  readonly properties: ProductPageDto['typicalProperties']
  readonly showCta?: boolean
}

export function TypicalPropertiesV05({
  copy,
  ctas,
  note,
  properties,
}: {
  readonly copy: ProductDetailPageDto['presentation']['technicalData']
  readonly ctas: ProductDetailPageDto['hero']['ctas']
  readonly note: string
  readonly properties: ProductDetailPageDto['technicalProperties']
}): React.ReactNode {
  return (
    <section
      aria-labelledby="detail-technical-data-heading"
      className={detail.technicalData}
      data-product-section="technical-data"
    >
      <div className={`${detail.wrap} ${detail.section}`}>
        <div className={detail.sectionHead}>
          <p className={detail.eyebrow}>{copy.eyebrow}</p>
          <h2 id="detail-technical-data-heading">{copy.heading}</h2>
          <p className={detail.sectionIntro}>{copy.intro}</p>
        </div>
        <div
          aria-label={copy.regionLabel}
          className={detail.tableRegion}
          role="region"
          tabIndex={0}
        >
          <table className={detail.propertyTable}>
            <caption>{copy.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{copy.headers.property}</th>
                <th scope="col">{copy.headers.value}</th>
                <th scope="col">{copy.headers.unit}</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={`${property.displayOrder}-${property.property}`}>
                  <th scope="row">{property.property}</th>
                  <td>{property.value}</td>
                  <td>{property.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={detail.technicalNote} data-technical-note>
          <strong>{copy.noteLabel}</strong> {note}
        </p>
        <ProductCtaV05 ctas={ctas} placement="technical-data" />
      </div>
    </section>
  )
}

export function TypicalProperties({
  ctas,
  productId,
  properties,
  showCta = true,
}: TypicalPropertiesProps) {
  return (
    <section
      className={`${styles.section} ${styles.propertiesSection}`}
      data-product-section="typical-properties"
      aria-labelledby="product-typical-properties-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Technical comparison</p>
        <h2 id="product-typical-properties-heading">Typical Properties</h2>
        <p>
          Use these typical values for screening and comparison. They are not
          guaranteed specifications.
        </p>
      </div>
      <p className={styles.tableHint} id="product-properties-table-hint">
        On narrow screens, scroll horizontally to compare every property detail.
      </p>
      <div
        className={styles.tableRegion}
        role="region"
        aria-labelledby="product-typical-properties-heading"
        aria-describedby="product-properties-table-hint"
        tabIndex={0}
      >
        <table className={styles.propertyTable}>
          <caption>Typical properties for {productId}</caption>
          <thead>
            <tr>
              <th scope="col">Property</th>
              <th scope="col">Typical value</th>
              <th scope="col">Unit</th>
              <th scope="col">Method</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={`${property.displayOrder}-${property.property}`}>
                <th scope="row">{property.property}</th>
                <td>{property.value}</td>
                <td>{property.unit}</td>
                <td>{property.method ?? '—'}</td>
                <td>{property.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCta ? (
        <ProductCta
          ctas={ctas}
          placement="after-properties"
          productId={productId}
        />
      ) : null}
    </section>
  )
}
