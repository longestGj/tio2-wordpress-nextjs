import type {EditorialLink} from '@/lib/editorial/types'

interface RelatedContentProps {
  readonly links: readonly EditorialLink[]
  readonly heading: string
  readonly headingId: string
  readonly sectionName: 'child-navigation' | 'related-content'
}

export function RelatedContent({
  links,
  heading,
  headingId,
  sectionName,
}: RelatedContentProps) {
  if (links.length === 0) return null

  return (
    <section data-application-section={sectionName} aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      <ul>
        {links.map((link) => (
          <li key={`${link.type}-${link.id}`}>
            {link.href ? <a href={link.href}>{link.title}</a> : <span>{link.title}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
