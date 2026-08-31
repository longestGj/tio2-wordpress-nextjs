import {describe, expect, it} from 'vitest'

import {
  ProductHubContractError,
  toMalaysiaProductHubDto,
} from '@/lib/wordpress/product-hub-v01-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {
  malaysiaProductHubSource,
  productHubReadiness,
} from '@/tests/fixtures/tio2-my-product-hub'

describe('Malaysia Product Hub DTO', () => {
  it('accepts one exact Malaysia record and preserves all 14 summaries', () => {
    const dto = toMalaysiaProductHubDto(malaysiaProductHubSource())
    expect(dto.identity).toMatchObject({
      pageId: 'PRODUCT-000', siteId: 'tio2-my', path: '/products',
      schemaVersion: 'product-hub-v0.1-malaysia', status: 'publish',
    })
    const grades = dto.directory.groups.flatMap((group) => group.grades)
    expect(grades).toHaveLength(14)
    expect(grades.find((grade) => grade.gradeId === 'M-896')?.summary).toBe(
      'Superior weather resistance with high gloss and excellent opacity for demanding exterior coatings.',
    )
    expect(Object.values(dto.routeReadiness).every(Boolean)).toBe(true)
  })

  it('rejects foreign scope without falling back', () => {
    const source = malaysiaProductHubSource() as unknown as Record<string, unknown>
    source.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductHubDto(source as never)).toThrow(CrossSiteContentError)
  })

  it('rejects changed contract bytes or incomplete readiness', () => {
    const changed = malaysiaProductHubSource() as unknown as Record<string, unknown>
    const payload = JSON.parse(String(changed.malaysiaProductHubContractJson))
    payload.seo.title = 'Changed'
    changed.malaysiaProductHubContractJson = JSON.stringify(payload)
    expect(() => toMalaysiaProductHubDto(changed as never)).toThrow(ProductHubContractError)

    const readiness = productHubReadiness()
    delete readiness['GRADE-M350']
    expect(() => toMalaysiaProductHubDto(malaysiaProductHubSource(readiness))).toThrow(
      ProductHubContractError,
    )
  })
})
