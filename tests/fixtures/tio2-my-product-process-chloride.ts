import {toMalaysiaChlorideProcessPageDto} from '@/lib/wordpress/product-process-chloride-v01-dto'
import type {MalaysiaChlorideProcessPageDto} from '@/lib/wordpress/product-process-chloride-v01-types'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-process-chloride.json'

export function malaysiaChlorideProcessDto(
  contract: unknown = approvedContract,
): MalaysiaChlorideProcessPageDto {
  return toMalaysiaChlorideProcessPageDto({
    id: 'chloride-process-18529',
    modifiedGmt: '2026-09-08T01:02:03',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/chloride-process-titanium-dioxide'},
    malaysiaChlorideProcessContractJson: JSON.stringify(contract),
  })
}
