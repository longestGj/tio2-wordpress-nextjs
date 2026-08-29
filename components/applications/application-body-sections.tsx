import type {ApplicationPageDto} from '@/lib/applications/types'

import styles from './application-page.module.css'

export const STARTING_PRODUCT_SECTION_IDS: ReadonlySet<string> = new Set([
  'evidence-backed-tiovar-starting-points-for-evaluation',
  'evidence-supported-tiovar-starting-points-for-evaluation',
])

export function ApplicationBodySections({
  sections,
  omitIds = new Set<string>(),
}: {
  readonly sections: ApplicationPageDto['bodySections']
  readonly omitIds?: ReadonlySet<string>
}) {
  const visibleSections = sections.filter(({id}) => !omitIds.has(id))
  if (visibleSections.length === 0) return null

  return (
    <div
      className={`${styles.wrap} ${styles.bodySections}`}
      data-application-body-sections
    >
      {visibleSections.map((section) => (
        <article key={section.id}>
          <h3>{section.heading}</h3>
          <div dangerouslySetInnerHTML={{__html: section.html}} />
        </article>
      ))}
    </div>
  )
}
