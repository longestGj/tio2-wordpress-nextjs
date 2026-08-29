import type {ProductPageDto} from '@/lib/products/types'
import type {PageCta, ProductDetailPageDto} from '@/lib/products/page-types'
import {getSiteConfig} from '@/sites'

import styles from './product-page.module.css'
import detail from './product-detail.module.css'

const SITE_A_ENQUIRY_HREF = getSiteConfig('tio2-a').rfqHref

export type ProductCtaPlacement = 'hero' | 'after-properties' | 'final'

interface ProductCtaProps {
  readonly ctas: ProductPageDto['ctas']
  readonly placement: ProductCtaPlacement
  readonly productId: string
}

function CtaActions({ctas}: Pick<ProductCtaProps, 'ctas'>) {
  return (
    <div className={styles.ctaActions}>
      <div className={styles.ctaAction}>
        <p>{ctas.requestTds.description}</p>
        <a className={styles.primaryCta} href={SITE_A_ENQUIRY_HREF}>
          {ctas.requestTds.label}
        </a>
      </div>
      <div className={styles.ctaAction}>
        <p>{ctas.discussApplication.description}</p>
        <a className={styles.secondaryCta} href={SITE_A_ENQUIRY_HREF}>
          {ctas.discussApplication.label}
        </a>
      </div>
    </div>
  )
}

export function ProductCta({ctas, placement, productId}: ProductCtaProps) {
  if (placement === 'final') {
    return (
      <section
        className={`${styles.section} ${styles.finalCta}`}
        data-product-section="final-cta"
        data-product-cta-placement="final"
        aria-labelledby="product-final-cta-heading"
      >
        <div className={styles.finalCtaCopy}>
          <p className={styles.eyebrow}>Next evaluation step</p>
          <h2 id="product-final-cta-heading">
            Discuss {productId} with our team
          </h2>
          <p>
            Request current documents or share the application details that
            matter to your technical and purchasing review.
          </p>
        </div>
        <CtaActions ctas={ctas} />
      </section>
    )
  }

  return (
    <div
      className={`${styles.ctaPanel} ${
        placement === 'hero' ? styles.heroCta : styles.inlineCta
      }`}
      data-product-cta-placement={placement}
    >
      <CtaActions ctas={ctas} />
    </div>
  )
}

export function ProductCtaV05({
  ctas,
  placement,
  copy,
}: {
  readonly ctas: readonly PageCta[]
  readonly placement: 'hero' | 'technical-data' | 'enquiry' | 'final'
  readonly copy?: ProductDetailPageDto['presentation']['finalCta']
}): React.ReactNode {
  const actions = (
    <div className={detail.ctaList} data-product-cta-placement={placement}>
      {ctas.map((cta) => (
        <a
          className={cta.kind === 'request-tds' ? detail.primaryAction : detail.secondaryAction}
          href={cta.href}
          key={`${placement}-${cta.kind}`}
        >
          {cta.label}
        </a>
      ))}
    </div>
  )

  if (placement !== 'final' || !copy) return actions
  return (
    <section
      aria-labelledby="detail-final-cta-heading"
      className={detail.finalCta}
      data-product-section="final-cta"
    >
      <div className={`${detail.wrap} ${detail.finalCtaInner}`}>
        <div>
          <p className={detail.eyebrow}>{copy.eyebrow}</p>
          <h2 id="detail-final-cta-heading">{copy.heading}</h2>
          <p>{copy.description}</p>
        </div>
        {actions}
      </div>
    </section>
  )
}
