import type {ApplicationPageDto} from '@/lib/applications/types'

import {ApplicationSections} from './application-detail'

export function ApplicationCategory({
  application,
}: {
  readonly application: ApplicationPageDto
}) {
  return (
    <ApplicationSections application={application} mode="category" showChildren />
  )
}
