import type {EditorialLink} from '@/lib/editorial/types'

import styles from './application-page.module.css'

function NavigationItem({link, index}: {readonly link: EditorialLink; readonly index: number}) {
  const content = (
    <>
      <span className={styles.routeIndex}>{String(index + 1).padStart(2, '0')}</span>
      <strong>{link.title}</strong>
      <span className={styles.routeArrow} aria-hidden>→</span>
    </>
  )

  return <li>{link.href ? <a href={link.href}>{content}</a> : <div>{content}</div>}</li>
}

function NavigationSection({
  links,
  sectionName,
  eyebrow,
  heading,
  intro,
}: {
  readonly links: readonly EditorialLink[]
  readonly sectionName: 'child-navigation' | 'cross-application'
  readonly eyebrow: string
  readonly heading: string
  readonly intro: string
}) {
  if (links.length === 0) return null
  const headingId = `application-${sectionName}-heading`
  return (
    <section
      id={sectionName === 'child-navigation' ? 'routes' : undefined}
      className={`${styles.section} ${styles.wrap} ${styles.navigationSection}`}
      data-application-section={sectionName}
      aria-labelledby={headingId}
    >
      <div className={styles.sectionHead}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={headingId}>{heading}</h2>
        <p className={styles.sectionIntro}>{intro}</p>
      </div>
      <ol className={styles.routeList}>
        {links.map((link, index) => (
          <NavigationItem link={link} index={index} key={`${link.type}-${link.id}`} />
        ))}
      </ol>
    </section>
  )
}

export function ApplicationHubNavigation({links}: {readonly links: readonly EditorialLink[]}) {
  const crossApplication = links.filter(({id}) => id === 'universal-multi-application')
  const categories = links.filter(({id}) => id !== 'universal-multi-application')
  return (
    <>
      <NavigationSection
        links={categories}
        sectionName="child-navigation"
        eyebrow="Application families"
        heading="Start with the material system"
        intro="Choose the application family that most closely matches the formulation, process, and finished-product conditions you need to evaluate."
      />
      <NavigationSection
        links={crossApplication}
        sectionName="cross-application"
        eyebrow="Cross-application route"
        heading="Need a broader starting point?"
        intro="Use the multi-purpose route when the same pigment direction must be screened across more than one application family."
      />
    </>
  )
}

export function ApplicationCategoryNavigation({links}: {readonly links: readonly EditorialLink[]}) {
  return (
    <NavigationSection
      links={links}
      sectionName="child-navigation"
      eyebrow="Coating routes"
      heading="Choose the coating route"
      intro="Start with the closest coating system, then define the formulation and finished-film evidence required before comparing candidates."
    />
  )
}
