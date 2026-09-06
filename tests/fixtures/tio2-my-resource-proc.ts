import {
  projectMalaysiaResourceProcPayload,
  toMalaysiaResourceProcDto,
} from '@/lib/wordpress/resource-proc-v01-dto'
import type {MalaysiaResourceProcDto} from '@/lib/wordpress/resource-proc-v01-types'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json'

export function malaysiaResourceProcDto(contract: unknown = approvedContract): MalaysiaResourceProcDto {
  return toMalaysiaResourceProcDto({
    id: 'resource-proc-82',
    modifiedGmt: '2026-09-06T00:30:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/resources/chloride-vs-sulfate-titanium-dioxide/'},
    resourceProcPayload: projectMalaysiaResourceProcPayload(contract),
  })
}
