import type {ProductPageDto} from '@/lib/products/types'

import styles from './product-page.module.css'

interface ProductFaqProps {
  readonly faqs: ProductPageDto['faqs']
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
