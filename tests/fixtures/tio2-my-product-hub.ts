import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-hub.json'

import type {MalaysiaProductHubSource} from '@/lib/wordpress/product-hub-v01-dto'

export function productHubReadiness(ready = true): Record<string, boolean> {
  return Object.fromEntries(
    approvedContract.routeRegistry.map((route) => [route.targetPageId, ready]),
  )
}

export function malaysiaProductHubSource(
  readiness: Readonly<Record<string, boolean>> = productHubReadiness(),
): MalaysiaProductHubSource {
  return {
    id: 'product-hub-my-1',
    modifiedGmt: '2026-08-31T01:02:03',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products'},
    malaysiaProductHubContractJson: JSON.stringify(approvedContract),
    routeReadiness: readiness,
  }
}
