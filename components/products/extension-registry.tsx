import type {ComponentType} from 'react'
import type {ZodType} from 'zod'

import type {ProductPageDto} from '@/lib/products/types'

import styles from './product-page.module.css'

export const PRODUCT_EXTENSION_INSERTION_POINTS = [
  'after-snapshot',
  'after-product-evidence',
  'after-validation-guide',
] as const

export type ProductExtensionInsertionPoint =
  (typeof PRODUCT_EXTENSION_INSERTION_POINTS)[number]

export interface ProductExtensionComponentProps {
  readonly product: ProductPageDto
  readonly content: unknown
}

export interface ProductExtensionDefinition {
  readonly key: string
  readonly insertionPoint: ProductExtensionInsertionPoint
  readonly schema: ZodType<unknown>
  readonly Component: ComponentType<ProductExtensionComponentProps>
  readonly selectContent: (product: ProductPageDto) => unknown | null
}

export const productExtensionRegistry: readonly ProductExtensionDefinition[] =
  Object.freeze([])

interface ProductExtensionSlotProps {
  readonly insertionPoint: ProductExtensionInsertionPoint
  readonly product: ProductPageDto
}

export function ProductExtensionSlot({
  insertionPoint,
  product,
}: ProductExtensionSlotProps) {
  const renderedExtensions = productExtensionRegistry.flatMap((extension) => {
    if (extension.insertionPoint !== insertionPoint) return []

    const source = extension.selectContent(product)
    if (source === null) return []

    const content = extension.schema.parse(source)
    const ExtensionComponent = extension.Component

    return [
      <ExtensionComponent
        key={extension.key}
        product={product}
        content={content}
      />,
    ]
  })

  if (renderedExtensions.length === 0) return null

  return (
    <div
      className={styles.extensionSlot}
      data-product-extension-slot={insertionPoint}
    >
      {renderedExtensions}
    </div>
  )
}
