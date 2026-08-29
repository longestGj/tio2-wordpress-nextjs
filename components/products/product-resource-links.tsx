import type {EditorialLink} from '@/lib/editorial/types'

import layout from './product-layout.module.css'

export function ProductResourceLinks({
  resources,
}: {
  readonly resources: readonly EditorialLink[]
}): React.ReactNode {
  return (
    <div className={layout.resourceGrid}>
      {resources.map((resource) => (
        <article className={layout.resourceCard} key={`${resource.type}-${resource.id}`}>
          <p className={layout.eyebrow}>Technical Resource</p>
          <h3>
            {resource.href ? (
              <a href={resource.href}>{resource.title}</a>
            ) : (
              resource.title
            )}
          </h3>
        </article>
      ))}
    </div>
  )
}
