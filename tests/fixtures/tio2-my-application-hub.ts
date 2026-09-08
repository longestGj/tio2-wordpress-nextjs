import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json'

import type {MalaysiaApplicationHubSource} from '@/lib/wordpress/application-hub-v01-dto'

export function applicationHubReadiness(ready = true): Record<string, boolean> {
  return Object.fromEntries(approvedContract.routeRegistry.map((route) => [route.targetPageId, ready]))
}

export function malaysiaApplicationHubSource(
  readiness: Readonly<Record<string, boolean>> = applicationHubReadiness(),
): MalaysiaApplicationHubSource {
  return {
    id: 'application-hub-my-1', modifiedGmt: '2026-09-08T08:00:00', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/applications'},
    malaysiaApplicationHubContractJson: JSON.stringify(approvedContract), routeReadiness: readiness,
  }
}

