import Image from 'next/image'

import type {HomepageHeroDto} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'

interface HomepageHeroProps {
  readonly hero: HomepageHeroDto
}

export function HomepageHero({hero}: HomepageHeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="homepage-hero-heading">
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>{hero.eyebrow}</p>
        <h1 id="homepage-hero-heading">{hero.heading}</h1>
        <p className={styles.heroSummary}>{hero.summary}</p>
        <div className={styles.heroActions}>
          <a href={hero.primaryCta.href}>{hero.primaryCta.label}</a>
          {hero.secondaryCta ? (
            <a href={hero.secondaryCta.href}>{hero.secondaryCta.label}</a>
          ) : null}
        </div>
      </div>
      {hero.image ? (
        <div className={styles.heroMedia}>
          <Image
            src={hero.image.src}
            alt={hero.image.alt}
            width={hero.image.width}
            height={hero.image.height}
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 46vw, 40vw"
            priority
            unoptimized
          />
        </div>
      ) : null}
    </section>
  )
}
