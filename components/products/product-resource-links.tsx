import type {EditorialLink} from '@/lib/editorial/types'

import layout from './product-layout.module.css'

export function ProductResourceLinks({
  cards,
  resources,
}: {
  readonly cards: ReadonlyArray<{
    readonly category: string
    readonly description: string
  }>
  readonly resources: readonly EditorialLink[]
}): React.ReactNode {
  return (
    <div className={layout.resourceGrid}>
      {resources.map((resource, index) => (
        <article className={layout.resourceCard} key={`${resource.type}-${resource.id}`}>
          <p className={layout.eyebrow}>{cards[index]!.category}</p>
          <h3>
            {resource.href ? (
              <a href={resource.href}>{resource.title}</a>
            ) : (
              resource.title
            )}
          </h3>
          <p>{cards[index]!.description}</p>
        </article>
      ))}
    </div>
  )
}
