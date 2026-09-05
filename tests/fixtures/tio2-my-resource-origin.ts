import {
  projectMalaysiaResourceOriginPayload,
  toMalaysiaResourceOriginDto,
} from '@/lib/wordpress/resource-origin-v01-dto'
import type {MalaysiaResourceOriginDto} from '@/lib/wordpress/resource-origin-v01-types'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json'

export function malaysiaResourceOriginDto(): MalaysiaResourceOriginDto {
  return toMalaysiaResourceOriginDto({
    id: 'resource-origin-81',
    modifiedGmt: '2026-09-05T02:00:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/resources/non-china-titanium-dioxide/'},
    resourceOriginPayload: projectMalaysiaResourceOriginPayload(approvedContract),
  })
}
