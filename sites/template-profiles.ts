import {getPublicRoutes} from './public-routes'
import type {SiteId, SiteTemplateProfile} from './types'

const proposalId = 'site-template-decoupling-v0.1'

const siteTemplateProfiles: Readonly<Record<SiteId, SiteTemplateProfile>> = Object.freeze({
  'tio2-a': Object.freeze({
    siteId: 'tio2-a',
    shell: Object.freeze({key: 'site-a-shell-active', state: 'active', proposalId}),
    homepage: Object.freeze({
      key: 'site-a-homepage-brand-v0.3',
      state: 'active',
      schemaVersion: 'homepage-v0.3-brand',
      proposalId,
    }),
  }),
  'tio2-b': Object.freeze({
    siteId: 'tio2-b',
    shell: Object.freeze({key: 'site-b-shell-v0.1-frozen', state: 'frozen', proposalId}),
    homepage: Object.freeze({
      key: 'site-b-homepage-v0.1-frozen',
      state: 'frozen',
      schemaVersion: 'homepage-v0.1',
      proposalId,
    }),
  }),
  'tio2-my': Object.freeze({
    siteId: 'tio2-my',
    shell: Object.freeze({
      key: 'tio2-my-shell-v0.4',
      state: 'active',
      proposalId: 'HOME-001-G7-HANDOFF-01',
    }),
    homepage: Object.freeze({
      key: 'tio2-my-homepage-v0.4',
      state: 'active',
      schemaVersion: 'homepage-v0.4-malaysia',
      proposalId: 'HOME-001-G7-HANDOFF-01',
    }),
  }),
})

for (const siteId of Object.keys(siteTemplateProfiles) as SiteId[]) {
  const [route] = getPublicRoutes(siteId)
  if (route.template !== siteTemplateProfiles[siteId].homepage.key) {
    throw new Error(`Public route template does not match homepage profile for ${siteId}`)
  }
}

export function getSiteTemplateProfile(siteId: SiteId): SiteTemplateProfile {
  if (!Object.hasOwn(siteTemplateProfiles, siteId)) {
    throw new Error(`Unknown site ID: ${siteId}`)
  }

  return siteTemplateProfiles[siteId]
}
