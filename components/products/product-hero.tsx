import type {ProductPageDto} from '@/lib/products/types'

import {ProductCta} from './product-cta'
import styles from './product-page.module.css'

interface ProductHeroProps {
  readonly ctas: ProductPageDto['ctas']
  readonly hero: ProductPageDto['hero']
  readonly identity: ProductPageDto['identity']
  readonly showCta?: boolean
}

export function ProductHero({
  ctas,
  hero,
  identity,
  showCta = true,
}: ProductHeroProps) {
  return (
    <section
      className={styles.hero}
      data-product-section="hero"
      aria-labelledby="product-hero-heading"
    >
      <div className={styles.heroIdentity}>
        <p className={styles.eyebrow}>{hero.eyebrow}</p>
        <p className={styles.gradeMeta}>
          <span>{identity.productId}</span>
          <span aria-hidden="true">/</span>
          <span>{identity.family}</span>
        </p>
        <h1 id="product-hero-heading">{identity.title}</h1>
        <p className={styles.problemHeadline}>{hero.problemHeadline}</p>
      </div>

      <div className={styles.quickAnswer}>
        <p className={styles.quickAnswerLabel}>Decision brief</p>
        <h2 id="product-quick-answer-heading">Quick Answer</h2>
        <div
          className={styles.richText}
          data-product-quick-answer
          dangerouslySetInnerHTML={{__html: hero.quickAnswer}}
        />
      </div>

      {showCta ? (
        <ProductCta ctas={ctas} placement="hero" productId={identity.productId} />
      ) : null}
    </section>
  )
}
