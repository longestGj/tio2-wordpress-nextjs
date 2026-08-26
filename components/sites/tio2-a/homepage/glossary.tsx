import type {EditorialGlossaryItemDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface GlossaryProps {
  readonly items: readonly EditorialGlossaryItemDto[]
}

export function Glossary({items}: GlossaryProps) {
  return (
    <section
      className={styles.section}
      aria-labelledby="site-a-glossary-heading"
    >
      <h2 id="site-a-glossary-heading">Glossary</h2>
      <dl className={styles.glossaryGrid}>
        {items.map((item) => (
          <div key={item.term}>
            <dt>{item.term}</dt>
            <dd>{item.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
