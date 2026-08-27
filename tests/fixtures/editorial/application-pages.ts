import type {ApplicationPageInput} from '@/lib/applications/schema'

import applicationManifest from './site-a-applications.synthetic.json'

function applicationFixture(id: string): ApplicationPageInput {
  const record = applicationManifest.records.find(
    (candidate) => candidate.identity.id === id,
  )
  if (!record) throw new Error(`Missing synthetic Application fixture: ${id}`)
  return structuredClone(record) as ApplicationPageInput
}

export const applicationHubInput = applicationFixture('applications-hub')
export const applicationCategoryInput = applicationFixture('coatings')
export const applicationDetailInput = applicationFixture('water-based-paint')
export const universalApplicationDetailInput = applicationFixture(
  'universal-multi-application',
)
