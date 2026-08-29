import type {ProductExperiencePageDto} from '@/lib/products/page-types'

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
    case 'detail':
      return null
  }
}
