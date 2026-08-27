import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import {ResourceSections} from './resource-article'

export function ResourceHub({
  resource,
}: {
  readonly resource: TechnicalResourcePageDto
}) {
  return <ResourceSections resource={resource} mode="hub" showChildren />
}
