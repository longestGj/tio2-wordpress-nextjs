import layout from './product-layout.module.css'

export interface ProductBreadcrumbItem {
  readonly label: string
  readonly href?: string
}

export function ProductBreadcrumbs({
  items,
}: {
  readonly items: readonly ProductBreadcrumbItem[]
}): React.ReactNode {
  return (
    <nav
      aria-label="Breadcrumb"
      className={layout.breadcrumb}
      data-product-section="breadcrumb"
    >
      <ol className={layout.breadcrumbList}>
        {items.map((item, index) => (
          <li className={layout.breadcrumbItem} key={item.label}>
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current={index === items.length - 1 ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
