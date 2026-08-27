import type {ApplicationPageDto} from '@/lib/applications/types'

import {ApplicationSections} from './application-detail'

export function ApplicationHub({
  application,
}: {
  readonly application: ApplicationPageDto
}) {
  return (
    <ApplicationSections application={application} mode="hub" showChildren />
  )
}
