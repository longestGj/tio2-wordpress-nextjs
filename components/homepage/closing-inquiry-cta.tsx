import type {HomepageClosingCtaDto} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'

interface ClosingInquiryCtaProps {
  readonly cta: HomepageClosingCtaDto
}

export function ClosingInquiryCta({cta}: ClosingInquiryCtaProps) {
  return (
    <section
      className={styles.closingCta}
      aria-labelledby="homepage-closing-heading"
    >
      <div>
        <h2 id="homepage-closing-heading">{cta.heading}</h2>
        <p>{cta.body}</p>
      </div>
      <a href={cta.href}>{cta.label}</a>
    </section>
  )
}
