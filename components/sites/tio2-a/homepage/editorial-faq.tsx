import type {HomepageFaqDto} from '@/lib/wordpress/homepage-types'

import styles from './homepage.module.css'

interface EditorialFaqProps {
  readonly faq: HomepageFaqDto
}

export function EditorialFaq({faq}: EditorialFaqProps) {
  return (
    <section
      className={`${styles.section} ${styles.faqSection}`}
      aria-labelledby="site-a-faq-heading"
    >
      <h2 id="site-a-faq-heading">{faq.heading}</h2>
      <div className={styles.faqGrid}>
        {faq.items.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
