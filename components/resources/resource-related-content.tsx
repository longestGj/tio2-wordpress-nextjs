import type {EditorialLink} from '@/lib/editorial/types'
import type {groupResourceRelationships} from '@/lib/resources/presentation-policy'

import styles from './resource-page.module.css'

type RelationshipGroups = ReturnType<typeof groupResourceRelationships>

function RelatedItem({
  label,
  link,
}: {
  readonly label: string
  readonly link: EditorialLink
}): React.ReactNode {
  const content = (
    <>
      <small>{label}</small>
      <strong>{link.title}</strong>
      <p>{`Review ${link.title} in the context of this technical decision.`}</p>
      {link.href ? <span aria-hidden="true">Review context →</span> : null}
    </>
  )
  return <li>{link.href ? <a href={link.href}>{content}</a> : <span>{content}</span>}</li>
}

export function ResourceRelatedContent({
  groups,
}: {
  readonly groups: RelationshipGroups
}): React.ReactNode {
  const grouped = [
    {label: 'Products', links: groups.products},
    {label: 'Applications', links: groups.applications},
    {label: 'Technical Resources', links: groups.resources},
  ] as const
  if (!grouped.some(({links}) => links.length > 0)) return null
  return (
    <section
      aria-labelledby="resource-related-content-heading"
      className={`${styles.relatedContent} ${styles.fullWidth}`}
      data-resource-section="related-content"
    >
      <p className={styles.eyebrow}>Continue the technical evaluation</p>
      <h2 id="resource-related-content-heading">
        Related Products, Applications and Resources
      </h2>
      <div className={styles.relatedGroups}>
        {grouped.map(({label, links}) =>
          links.length > 0 ? (
            <div className={styles.relatedGroup} key={label}>
              <h3>{label}</h3>
              <ul>
                {links.map((link) => (
                  <RelatedItem
                    key={`${link.type}-${link.id}`}
                    label={link.type}
                    link={link}
                  />
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </section>
  )
}
