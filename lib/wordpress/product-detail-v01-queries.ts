import type {FetchGraphQLOptions} from './client'
import {productDetailContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaProductDetailDocument,
  type GetMalaysiaProductDetailQuery,
  type GetMalaysiaProductDetailQueryVariables,
} from './generated'
import {
  ProductDetailContractError,
  toMalaysiaProductDetailDto,
  type MalaysiaProductDetailSource,
} from './product-detail-v01-dto'
import type {MalaysiaProductDetailDto} from './product-detail-v01-types'

export const GET_MALAYSIA_PRODUCT_DETAIL = GetMalaysiaProductDetailDocument

export async function getMalaysiaProductDetail(
  slug: 'm-350',
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaProductDetailDto> {
  const data = await fetchGraphQL<
    GetMalaysiaProductDetailQuery,
    GetMalaysiaProductDetailQueryVariables
  >(GET_MALAYSIA_PRODUCT_DETAIL, {slug}, {
    ...options,
    tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', '/products/m-350'),
      productDetailContentTag('tio2-my', slug),
    ],
  })
  let source: unknown
  try {
    source = JSON.parse(data.malaysiaProductDetailRecordJson)
  } catch {
    throw new ProductDetailContractError('productDetailRecordJson')
  }
  return toMalaysiaProductDetailDto(source as MalaysiaProductDetailSource)
}
