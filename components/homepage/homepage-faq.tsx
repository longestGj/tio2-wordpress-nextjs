import type {HomepageFaqDto} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'

interface HomepageFaqProps {
  readonly faq: HomepageFaqDto
}

export function HomepageFaq({faq}: HomepageFaqProps) {
  return (
    <section
      className={styles.faqSection}
      aria-labelledby="homepage-faq-heading"
    >
      <div className={styles.sectionIntro}>
        <h2 id="homepage-faq-heading">{faq.heading}</h2>
      </div>
      <div className={styles.faqList}>
        {faq.items.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <div>
              <p>{item.answer}</p>
              {item.relatedLink ? (
                <a href={item.relatedLink.href}>{item.relatedLink.label}</a>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
