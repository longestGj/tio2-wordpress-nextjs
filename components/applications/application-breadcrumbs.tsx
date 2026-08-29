import type {ApplicationPageDto} from '@/lib/applications/types'
import {buildApplicationBreadcrumbItems} from '@/lib/seo/application-jsonld'
import {getSiteConfig} from '@/sites'

import styles from './application-page.module.css'

export function ApplicationBreadcrumbs({
  application,
}: {
  readonly application: ApplicationPageDto
}) {
  const items = buildApplicationBreadcrumbItems(
    application,
    getSiteConfig('tio2-a'),
  )
  return (
    <nav
      className={styles.breadcrumbs}
      aria-label="Breadcrumb"
      data-application-section="breadcrumb"
    >
      <ol>
        {items.map((item) => (
          <li key={item.path}>
            {item.current ? (
              <span aria-current="page">{item.title}</span>
            ) : item.href ? (
              <a href={item.href}>{item.title}</a>
            ) : (
              <span>{item.title}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
