import type {ResourceBreadcrumbItem} from '@/lib/seo/resource-jsonld'

import styles from './resource-page.module.css'

export function ResourceBreadcrumbs({
  items,
}: {
  readonly items: readonly ResourceBreadcrumbItem[]
}): React.ReactNode {
  return (
    <nav
      aria-label="Breadcrumb"
      className={styles.breadcrumbs}
      data-resource-section="breadcrumb"
    >
      <ol className={styles.mediumWidth}>
        {items.map((item) => (
          <li key={item.path}>
            {item.href ? (
              <a aria-current={item.current ? 'page' : undefined} href={item.href}>
                {item.title}
              </a>
            ) : (
              <span aria-current={item.current ? 'page' : undefined}>
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
