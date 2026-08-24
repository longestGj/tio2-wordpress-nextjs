import Image from 'next/image'

import type {
  HomepageLinkCardDto,
  HomepageSectionIntroDto,
} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'

interface ProductDiscoveryProps {
  readonly intro: HomepageSectionIntroDto
  readonly routes: readonly HomepageLinkCardDto[]
}

export function ProductDiscovery({intro, routes}: ProductDiscoveryProps) {
  return (
    <section
      className={styles.editorialSection}
      aria-labelledby="homepage-products-heading"
    >
      <div className={styles.sectionIntro}>
        <h2 id="homepage-products-heading">{intro.heading}</h2>
        <p>{intro.intro}</p>
      </div>
      <div className={styles.cardGrid}>
        {routes.map((route) => (
          <article className={styles.card} key={route.path}>
            {route.image ? (
              <Image
                src={route.image.src}
                alt={route.image.alt}
                width={route.image.width}
                height={route.image.height}
                sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 40vw"
                loading="lazy"
                unoptimized
              />
            ) : null}
            <h3>
              {route.href ? (
                <a className={styles.cardLink} href={route.href}>{route.title}</a>
              ) : route.title}
            </h3>
            <p>{route.summary}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
