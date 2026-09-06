import {describe, expect, it} from 'vitest'

import {buildMalaysiaMarketHubMetadata} from '@/lib/seo/market-hub-metadata'
import {toMalaysiaMarketHubDto} from '@/lib/wordpress/market-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'

function marketHub() {
  return toMalaysiaMarketHubDto({
    id: 'market-hub-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/markets'},
    malaysiaMarketHubContractJson: JSON.stringify(approvedContract),
  })
}

describe('MARKET-000 metadata', () => {
  it('uses the route-safe description, one self-canonical and noindex before release', () => {
    const metadata = buildMalaysiaMarketHubMetadata(
      getSiteConfig('tio2-my'), marketHub(), {VERCEL_ENV: 'production'},
    )
    expect(metadata).toMatchObject({
      title: approvedContract.seo.title,
      description: approvedContract.seo.routeSafeDescription,
      alternates: {canonical: 'https://tio2malaysia.com/markets/'},
      robots: {index: false, follow: false},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
    expect(metadata.openGraph).not.toHaveProperty('images.0')
    expect(JSON.stringify(metadata)).not.toMatch(/tio2products|tio2hub|pt-BR/iu)
  })
})
