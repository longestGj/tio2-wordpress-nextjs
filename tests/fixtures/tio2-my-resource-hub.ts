import type {MalaysiaResourceHubSource} from '@/lib/wordpress/resource-hub-v01-dto'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

export function malaysiaResourceHubSource(): MalaysiaResourceHubSource {
  return {
    id: 'resource-hub-my-1', modifiedGmt: '2026-09-01T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/resources'},
    malaysiaResourceHubContractJson: JSON.stringify(approvedContract),
    resourceProjection: {publicState: 'H0_NO_QUALIFIED_RESOURCE', featuredResources: [], latestResources: []},
  }
}
