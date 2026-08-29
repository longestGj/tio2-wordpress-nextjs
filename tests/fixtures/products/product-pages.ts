import representativeJson from './site-a-products.approved-representatives.json'

import type {
  ProductDetailPageInput,
  ProductFamilyPageInput,
  ProductsHubPageInput,
  SiteAProductRepresentativeFixture,
} from '@/lib/products/page-schema'

export const siteAProductRepresentativeFixture =
  representativeJson as unknown as SiteAProductRepresentativeFixture

export const productsHubPageInput =
  siteAProductRepresentativeFixture.records[0] as ProductsHubPageInput
export const coatingsFamilyPageInput =
  siteAProductRepresentativeFixture.records[1] as ProductFamilyPageInput
export const tpC120ProductPageInput =
  siteAProductRepresentativeFixture.records[2] as ProductDetailPageInput
