import Image from 'next/image'

import type {SiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface HeroProps {
  readonly hero: SiteAEditorialHomepageDto['hero']
}

export function Hero({hero}: HeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="site-a-hero-heading">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{hero.eyebrow}</p>
        <h1 id="site-a-hero-heading">{hero.heading}</h1>
        <p className={styles.heroSummary}>{hero.summary}</p>
      </div>
      {hero.image ? (
        <div className={styles.heroMedia}>
          <Image
            src={hero.image.src}
            alt={hero.image.alt}
            width={hero.image.width}
            height={hero.image.height}
            sizes="(max-width: 780px) 100vw, (max-width: 1200px) 48vw, 42vw"
            priority
          />
        </div>
      ) : null}
    </section>
  )
}
