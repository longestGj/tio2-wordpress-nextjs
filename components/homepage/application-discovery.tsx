import Image from 'next/image'

import type {
  HomepageLinkCardDto,
  HomepageSectionIntroDto,
} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'

interface ApplicationDiscoveryProps {
  readonly intro: HomepageSectionIntroDto
  readonly applications: readonly HomepageLinkCardDto[]
}

export function ApplicationDiscovery({
  intro,
  applications,
}: ApplicationDiscoveryProps) {
  return (
    <section
      className={`${styles.editorialSection} ${styles.sageSection}`}
      aria-labelledby="homepage-applications-heading"
    >
      <div className={styles.sectionIntro}>
        <h2 id="homepage-applications-heading">{intro.heading}</h2>
        <p>{intro.intro}</p>
      </div>
      <div className={styles.applicationGrid}>
        {applications.map((application) => (
          <article className={styles.applicationCard} key={application.path}>
            {application.image ? (
              <Image
                src={application.image.src}
                alt={application.image.alt}
                width={application.image.width}
                height={application.image.height}
                sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 30vw"
                loading="lazy"
                unoptimized
              />
            ) : null}
            <h3>
              {application.href ? (
                <a href={application.href}>{application.title}</a>
              ) : application.title}
            </h3>
            <p>{application.summary}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
