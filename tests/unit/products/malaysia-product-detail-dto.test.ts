import {describe, expect, it} from 'vitest'

import {
  ProductDetailContractError,
  toMalaysiaProductDetailDto,
} from '@/lib/wordpress/product-detail-v01-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {
  malaysiaProductDetailSource,
  productDetailReadiness,
} from '@/tests/fixtures/tio2-my-product-detail'

describe('M-350 scoped public projection DTO', () => {
  it('accepts the exact minimum projection and omits every unready contextual module', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaProductDetailSource())
    expect(dto.identity).toMatchObject({
      pageId: 'GRADE-M350', gradeCode: 'M-350', siteId: 'tio2-my',
      path: '/products/m-350', recordState: 'approved_for_preview',
    })
    expect(dto.modules.hero.actions).toEqual([])
    expect(Object.keys(dto.modules)).toEqual([
      'hero', 'positioning', 'applications', 'evaluation', 'technical',
    ])
    expect(dto.modules.technical.rows).toHaveLength(15)
  })

  it('accepts only approved ready subsets in original order', () => {
    const readiness = productDetailReadiness()
    readiness['CONV-RFQ'] = true
    readiness['CONV-SAMPLE'] = true
    readiness['CONV-DOC'] = true
    readiness['MARKET-EU-001'] = true
    readiness['GRADE-M510'] = true
    readiness['GRADE-M896'] = true
    const dto = toMalaysiaProductDetailDto(malaysiaProductDetailSource(readiness))
    expect(dto.modules.hero.actions.map((item) => item.targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.documents?.targetPageId).toBe('CONV-DOC')
    expect(dto.modules.markets?.items.map((item) => item.targetPageId)).toEqual(['MARKET-EU-001'])
    expect(dto.modules.relatedGrades?.items.map((item) => item.targetPageId)).toEqual(['GRADE-M510', 'GRADE-M896'])
  })

  it('rejects cross-scope, raw governance and unapproved public values', () => {
    const crossScope = malaysiaProductDetailSource() as unknown as Record<string, unknown>
    crossScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(crossScope as never)).toThrow(CrossSiteContentError)

    const leaked = structuredClone(malaysiaProductDetailSource()) as unknown as Record<string, unknown>
    const projection = leaked.publicProjection as Record<string, unknown>
    projection.evidenceLedger = [{sourceRefs: ['private']}]
    expect(() => toMalaysiaProductDetailDto(leaked as never)).toThrow(ProductDetailContractError)

    const mutated = structuredClone(malaysiaProductDetailSource()) as unknown as Record<string, unknown>
    const modules = (mutated.publicProjection as Record<string, unknown>).modules as Record<string, unknown>
    const technical = modules.technical as {rows: Array<{typical: string}>}
    technical.rows[0]!.typical = '99.9'
    expect(() => toMalaysiaProductDetailDto(mutated as never)).toThrow(ProductDetailContractError)
  })
})
