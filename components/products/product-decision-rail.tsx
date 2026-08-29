import type {DecisionRailItem} from '@/lib/products/page-types'

import layout from './product-layout.module.css'

export function ProductDecisionRail({
  items,
}: {
  readonly items: readonly DecisionRailItem[]
}): React.ReactNode {
  return (
    <nav
      aria-label="Product decision path"
      className={layout.decisionRail}
      data-product-section="decision-rail"
    >
      <ol>
        {items.map((item) => (
          <li key={`${item.index}-${item.label}`}>
            <span>{item.index}</span> {item.label}
          </li>
        ))}
      </ol>
    </nav>
  )
}
