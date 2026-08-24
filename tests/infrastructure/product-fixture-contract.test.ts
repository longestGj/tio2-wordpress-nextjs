import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const manifestPath = fileURLToPath(
  new URL('../../wordpress/seed/representative-content.json', import.meta.url),
)

interface SeedEntity {
  id: string
  postType: string
  postStatus?: string
  siteScopes?: string[]
  publicPath?: string | null
  title: string
  content: string
  technicalSummary: string
  evidenceSourceUrl: string
}

const expectedProductContent = {
  id: 'test-product-reference',
  postType: 'tio2_product',
  title: 'Synthetic Test Product Reference',
  content:
    '<p><strong>SYNTHETIC TEST CONTENT.</strong> Placeholder product entity for local integration behavior only. It is not a commercial offer or specification.</p>',
  technicalSummary:
    'SYNTHETIC TEST CONTENT — intentionally contains no performance values or verified product claims.',
  evidenceSourceUrl: 'https://example.test/synthetic-only',
} as const

describe('Product fixture declaration', () => {
  it('retains the stable Product fixture as an exact Site A draft with no public path', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      sharedEntities: SeedEntity[]
    }
    const products = manifest.sharedEntities.filter(
      ({id, postType}) => id === 'test-product-reference' || postType === 'tio2_product',
    )

    expect(products).toHaveLength(1)
    const product = products[0]!
    expect(product).toEqual({
      ...expectedProductContent,
      postStatus: 'draft',
      siteScopes: ['tio2-a'],
    })
    expect(Object.hasOwn(product, 'publicPath')).toBe(false)
  })
})
