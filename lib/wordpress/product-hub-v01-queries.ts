import type {FetchGraphQLOptions} from './client'
import {productHubContentTag, routeTag, siteTag} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetMalaysiaProductHubDocument,
  type GetMalaysiaProductHubQuery,
  type GetMalaysiaProductHubQueryVariables,
} from './generated'
import {
  ProductHubContractError,
  toMalaysiaProductHubDto,
  type MalaysiaProductHubSource,
} from './product-hub-v01-dto'
import type {MalaysiaProductHubDto} from './product-hub-v01-types'

export const GET_MALAYSIA_PRODUCT_HUB = GetMalaysiaProductHubDocument

export async function getMalaysiaProductHub(
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<MalaysiaProductHubDto> {
  const data = await fetchGraphQL<
    GetMalaysiaProductHubQuery,
    GetMalaysiaProductHubQueryVariables
  >(GET_MALAYSIA_PRODUCT_HUB, {}, {
    ...options,
    tags: [
      siteTag('tio2-my'),
      routeTag('tio2-my', '/products'),
      productHubContentTag('tio2-my'),
    ],
  })
  let source: unknown
  try {
    source = JSON.parse(data.malaysiaProductHubRecordJson)
  } catch {
    throw new ProductHubContractError('productHubRecordJson')
  }
  return toMalaysiaProductHubDto(source as MalaysiaProductHubSource)
}
