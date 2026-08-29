import type {ProductExperiencePageDto} from '@/lib/products/page-types'

import {ProductFamily} from './product-family'
import {ProductDetail} from './product-detail'
import {ProductsHub} from './products-hub'

export function ProductPageRenderer({
  page,
}: {
  readonly page: ProductExperiencePageDto
}): React.ReactNode {
  switch (page.level) {
    case 'hub':
      return <ProductsHub page={page} />
    case 'family':
      return <ProductFamily page={page} />
    case 'detail':
      return <ProductDetail page={page} />
  }
}
