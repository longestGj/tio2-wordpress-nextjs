import {describe, expect, it} from 'vitest'

import {buildMalaysiaResourceHubMetadata} from '@/lib/seo/resource-hub-metadata'
import {toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

const hub = () => toMalaysiaResourceHubDto({
  id: 'resource-hub-my-1', modifiedGmt: '2026-09-01T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/resources'},
  malaysiaResourceHubContractJson: JSON.stringify(contract),
  resourceProjection: {publicState: 'H0_NO_QUALIFIED_RESOURCE', featuredResources: [], latestResources: []},
})

describe('RES-000 metadata', () => {
  it('uses exact copy, one self-canonical, no hreflang and noindex before release', () => {
    const metadata = buildMalaysiaResourceHubMetadata(getSiteConfig('tio2-my'), hub(), {VERCEL_ENV: 'production'})
    expect(metadata).toMatchObject({
      title: contract.seo.title,
      description: contract.seo.description,
      alternates: {canonical: 'https://tio2malaysia.com/resources/'},
      robots: {index: false, follow: false},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
    expect(JSON.stringify(metadata)).not.toMatch(/tio2products|tio2hub|pt-BR/iu)
  })
})
