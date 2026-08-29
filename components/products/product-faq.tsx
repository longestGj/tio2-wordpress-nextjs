import type {ProductPageDto} from '@/lib/products/types'
import type {ProductDetailPageDto} from '@/lib/products/page-types'

import detail from './product-detail.module.css'
import styles from './product-page.module.css'

interface ProductFaqProps {
  readonly faqs: ProductPageDto['faqs']
}

export function ProductFaqV05({
  copy,
  faqs,
}: {
  readonly copy: ProductDetailPageDto['presentation']['faq']
  readonly faqs: ProductDetailPageDto['faqs']
}): React.ReactNode {
  return (
    <section
      aria-labelledby="detail-faq-heading"
      className={`${detail.section} ${detail.soft}`}
      data-product-section="faq"
    >
      <div className={detail.wrap}>
        <div className={detail.sectionHead}>
          <p className={detail.eyebrow}>{copy.eyebrow}</p>
          <h2 id="detail-faq-heading">{copy.heading}</h2>
        </div>
        <div className={detail.faqList}>
          {faqs.map((faq) => (
            <details data-product-faq-item key={faq.question}>
              <summary>{faq.question}<span aria-hidden="true">+</span></summary>
              <div dangerouslySetInnerHTML={{__html: faq.answerHtml}} />
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ProductFaq({faqs}: ProductFaqProps) {
  return (
    <section
      className={`${styles.section} ${styles.faqSection}`}
      data-product-section="frequently-asked-questions"
      aria-labelledby="product-faq-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Common evaluation questions</p>
        <h2 id="product-faq-heading">Frequently Asked Questions</h2>
      </div>
      <ol className={styles.faqList}>
        {faqs.map((faq, index) => (
          <li
            className={styles.faqItem}
            data-product-faq-item
            key={`${index}-${faq.question}`}
          >
            <article>
              <h3>{faq.question}</h3>
              <div
                className={styles.richText}
                dangerouslySetInnerHTML={{__html: faq.answerHtml}}
              />
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}
