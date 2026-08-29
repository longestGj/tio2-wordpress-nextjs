import type {ApplicationPageDto, ApplicationStartingProduct} from '@/lib/applications/types'

import styles from './application-page.module.css'

function ProductAction({item}: {readonly item: ApplicationStartingProduct}) {
  const productId = item.product.id
  return item.product.href ? (
    <a className={styles.productViewAction} href={item.product.href}>
      View {productId}
    </a>
  ) : (
    <span className={styles.productViewAction}>View {productId}</span>
  )
}

function CategoryCandidates({application}: {readonly application: ApplicationPageDto}) {
  return (
    <div className={styles.candidateMatrix}>
      {application.startingProducts.map((item) => (
        <details data-application-candidate key={item.product.id}>
          <summary>
            <span className={styles.candidateApplication}>{item.label}</span>
            <strong>{item.product.id}</strong>
            <span className={styles.disclosureMark} aria-hidden>+</span>
          </summary>
          <div className={styles.candidateBody}>
            <div dangerouslySetInnerHTML={{__html: item.summaryHtml}} />
            <ProductAction item={item} />
          </div>
        </details>
      ))}
    </div>
  )
}

function DetailProducts({application}: {readonly application: ApplicationPageDto}) {
  const primary = application.startingProducts.find(({role}) => role === 'primary')
  const alternatives = application.startingProducts.filter(
    ({role}) => role === 'alternative',
  )
  const requestTds = application.ctas.find(({kind}) => kind === 'request-tds')
  const requestSample = application.ctas.find(({kind}) => kind === 'request-sample')
  const discussApplication = application.ctas.find(
    ({kind}) => kind === 'discuss-application',
  )

  return (
    <>
      {primary ? (
        <article
          className={styles.primaryProduct}
          data-testid={`application-starting-product-${primary.product.id}`}
        >
          <div>
            <p className={styles.eyebrow}>{primary.label}</p>
            <h3>{primary.product.id}</h3>
            <div dangerouslySetInnerHTML={{__html: primary.summaryHtml}} />
          </div>
          <div className={styles.productActions}>
            <ProductAction item={primary} />
            {requestTds ? <a href={requestTds.href}>{requestTds.label}</a> : null}
            {requestSample ? (
              <a className={styles.tertiaryAction} href={requestSample.href}>
                {requestSample.label}
              </a>
            ) : null}
            {discussApplication ? (
              <a
                className={styles.tertiaryAction}
                href={discussApplication.href}
              >
                Discuss Formulation
              </a>
            ) : null}
          </div>
        </article>
      ) : null}
      {alternatives.length > 0 ? (
        <div className={styles.alternativeProducts}>
          <p>Alternative candidates</p>
          {alternatives.map((item) => (
            <article
              data-testid={`application-starting-product-${item.product.id}`}
              key={item.product.id}
            >
              <div><strong>{item.product.id}</strong><span>{item.label}</span></div>
              <div dangerouslySetInnerHTML={{__html: item.summaryHtml}} />
              <ProductAction item={item} />
            </article>
          ))}
        </div>
      ) : null}
    </>
  )
}

export function ApplicationStartingProducts({
  application,
}: {
  readonly application: ApplicationPageDto
}) {
  if (application.startingProducts.length === 0) return null
  const headingId = 'application-starting-products-heading'
  const category = application.identity.level === 'category'
  const plastics = application.identity.id === 'plastics'
  return (
    <section
      id="starting-products"
      className={`${styles.section} ${styles.wrap} ${styles.startingProducts}`}
      data-application-section="starting-products"
      aria-labelledby={headingId}
    >
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>
          {category
            ? plastics
              ? 'Evaluation starting points'
              : 'Selection matrix'
            : 'Product bridge'}
        </p>
        <h2 id={headingId}>
          {category
            ? plastics
              ? 'Match the Plastics Route to a Starting Candidate'
              : 'Connect each coating decision to a testable candidate'
            : 'Begin with the primary candidate'}
        </h2>
        {plastics ? <p>{application.decisionGuide.buyerProblem}</p> : null}
      </div>
      {category ? (
        <CategoryCandidates application={application} />
      ) : (
        <DetailProducts application={application} />
      )}
    </section>
  )
}
