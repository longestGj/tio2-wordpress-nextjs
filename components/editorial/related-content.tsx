import type {EditorialLink} from '@/lib/editorial/types'

interface RelatedContentProps {
  readonly links: readonly EditorialLink[]
  readonly heading: string
  readonly headingId: string
  readonly sectionName: 'child-navigation' | 'related-content'
  readonly showTypeLabels?: boolean
  readonly summaries?: ReadonlyMap<string, string>
  readonly typeLabelById?: ReadonlyMap<string, string>
}

export function RelatedContent({
  links,
  heading,
  headingId,
  sectionName,
  showTypeLabels = false,
  summaries,
  typeLabelById,
}: RelatedContentProps) {
  if (links.length === 0) return null

  return (
    <section data-editorial-section={sectionName} aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      <ul>
        {links.map((link) => {
          const content = (
            <>
              {showTypeLabels ? (
                <small>
                  {typeLabelById?.get(link.id) ??
                    (link.type === 'product' ? 'PRODUCT' : 'TECHNICAL RESOURCE')}
                </small>
              ) : null}
              <strong>{link.title}</strong>
              {summaries?.get(link.id) ? (
                <div
                  dangerouslySetInnerHTML={{__html: summaries.get(link.id) ?? ''}}
                />
              ) : null}
            </>
          )
          return (
            <li key={`${link.type}-${link.id}`}>
              {link.href ? <a href={link.href}>{content}</a> : <span>{content}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
