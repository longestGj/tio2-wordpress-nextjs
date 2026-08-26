import type {SiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface ClosingCtaProps {
  readonly closingCta: SiteAEditorialHomepageDto['closingCta']
}

export function ClosingCta({closingCta}: ClosingCtaProps) {
  return (
    <section
      className={`${styles.section} ${styles.closingCta}`}
      aria-labelledby="site-a-closing-heading"
    >
      <div>
        <h2 id="site-a-closing-heading">{closingCta.heading}</h2>
        <p>{closingCta.body}</p>
      </div>
      <a href={closingCta.href}>{closingCta.label}</a>
    </section>
  )
}
