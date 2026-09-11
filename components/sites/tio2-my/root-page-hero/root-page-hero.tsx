import type {ReactNode} from 'react'

import styles from './root-page-hero.module.css'

export type RootPageHeroVariant = 'flagship-light' | 'hub-light' | 'hub-dark' | 'corporate-light'
export type RootPageHeroSurface = 'open' | 'framed' | 'preserve'

export interface RootPageHeroProps {
  readonly pageId: 'HOME-001' | 'APP-000' | 'PRODUCT-000' | 'MARKET-000' | 'DOC-000' | 'RES-000' | 'ABOUT-001'
  readonly variant: RootPageHeroVariant
  readonly surface?: RootPageHeroSurface
  readonly breadcrumbLabel?: string
  /** Preserve a page-level breadcrumb module hook where its public contract permits it. */
  readonly breadcrumbModuleName?: string
  readonly eyebrow: string
  readonly heading: string
  readonly headingId?: string
  /** Preserve an existing page-level module hook when the page contract uses one. */
  readonly moduleName?: string
  readonly intro: ReactNode
  readonly actions: ReactNode
  readonly media?: ReactNode
  readonly mediaClassName?: string
  readonly className?: string
  readonly mobileHeadingFit?: 'default' | 'wide'
  readonly mobileHeadingTracking?: 'compact' | 'normal'
}

export function RootPageHero({
  variant,
  surface = 'framed',
  breadcrumbLabel,
  breadcrumbModuleName,
  eyebrow,
  heading,
  headingId,
  moduleName,
  intro,
  actions,
  media,
  mediaClassName,
  className,
  mobileHeadingFit = 'default',
  mobileHeadingTracking = 'compact',
}: RootPageHeroProps) {
  return (
    <>
      {breadcrumbLabel ? (
        <nav
          className={styles.breadcrumb}
          aria-label="Breadcrumb"
          data-root-page-hero-breadcrumb="true"
          {...(breadcrumbModuleName ? {'data-module': breadcrumbModuleName} : {})}
        >
          <ol><li><a href="/">Home</a></li><li><span aria-current="page">{breadcrumbLabel}</span></li></ol>
        </nav>
      ) : null}
      <section
        className={[styles.hero, className].filter(Boolean).join(' ')}
        data-root-page-hero="true"
        data-hero-variant={variant}
        data-hero-surface={surface}
        data-hero-mobile-heading-fit={mobileHeadingFit}
        data-hero-mobile-heading-tracking={mobileHeadingTracking}
        {...(moduleName ? {'data-module': moduleName} : {})}
        {...(headingId ? {'aria-labelledby': headingId} : {'aria-label': heading})}
      >
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 {...(headingId ? {id: headingId} : {})}>{heading}</h1>
          <div className={styles.intro}>{intro}</div>
          <div className={styles.actions} data-root-page-hero-actions="true">{actions}</div>
        </div>
        {media ? <div className={[styles.media, mediaClassName].filter(Boolean).join(' ')}>{media}</div> : null}
      </section>
    </>
  )
}
