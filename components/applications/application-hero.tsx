import Image from 'next/image'

import type {ApplicationPageDto} from '@/lib/applications/types'

import styles from './application-page.module.css'

const HERO_IMAGE_BY_LEVEL = {
  hub: '/site-a/applications/applications-hub-hero.jpg',
  category: '/site-a/applications/coatings-category-hero.png',
  detail: '/site-a/applications/water-based-paint-detail-hero.png',
} as const

function Headline({value}: {readonly value: string}) {
  const parts = value.split('Water-Based')
  if (parts.length === 1) return value
  return parts.map((part, index) => (
    <span key={`${index}-${part}`}>
      {index > 0 ? <span className={styles.noBreak}>Water-Based</span> : null}
      {part}
    </span>
  ))
}

export function ApplicationHero({
  application,
}: {
  readonly application: ApplicationPageDto
}) {
  const primaryCta = application.ctas.find(
    ({kind}) => kind === 'discuss-application',
  )
  const secondaryCta = application.ctas.find(({kind}) => kind === 'request-tds')
  const firstSection = application.identity.level === 'detail'
    ? application.startingProducts.length > 0
      ? {href: '#starting-products', label: 'Starting grade'}
      : null
    : application.children.length > 0
      ? {href: '#routes', label: 'Routes'}
      : null
  const navigationItems = [
    firstSection,
    {href: '#selection', label: 'Selection'},
    {href: '#validation', label: 'Validation'},
    {href: '#inquiry', label: 'Enquiry'},
  ].filter((item): item is {href: string; label: string} => item !== null)

  return (
    <section
      className={styles.hero}
      data-application-section="hero"
      aria-labelledby="application-hero-heading"
    >
      <Image
        className={styles.heroImage}
        src={HERO_IMAGE_BY_LEVEL[application.identity.level]}
        alt=""
        fill
        priority
        sizes="(max-width: 700px) 100vw, 67vw"
      />
      <div className={`${styles.wrap} ${styles.heroInner}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{application.hero.eyebrow}</p>
          <h1 id="application-hero-heading">
            <Headline value={application.hero.headline} />
          </h1>
          <div
            className={styles.heroSummary}
            dangerouslySetInnerHTML={{__html: application.hero.directAnswer}}
          />
          {primaryCta || secondaryCta ? (
            <div className={styles.heroActions}>
              {primaryCta ? (
                <a className={styles.primaryButton} href={primaryCta.href}>
                  {primaryCta.label}
                </a>
              ) : null}
              {secondaryCta ? (
                <a className={styles.secondaryButton} href={secondaryCta.href}>
                  {secondaryCta.label}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <nav className={styles.heroNav} aria-label="On this page">
        <ol className={styles.wrap}>
          {navigationItems.map((item, index) => (
            <li key={item.href}>
              <a href={item.href}>
                {String(index + 1).padStart(2, '0')} {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  )
}
