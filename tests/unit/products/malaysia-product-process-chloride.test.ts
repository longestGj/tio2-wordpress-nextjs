import {describe, expect, it} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-process-chloride.json'
import {
  ChlorideProcessContractError,
  toMalaysiaChlorideProcessPageDto,
} from '@/lib/wordpress/product-process-chloride-v01-dto'
import {resolveMalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import {resolveMalaysiaRequestDocumentsPrefill} from '@/lib/request-documents/malaysia-request-documents-prefill'

function source(payload: unknown = contract) {
  return {
    id: 'chloride-process-1', modifiedGmt: '2026-09-08T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/chloride-process-titanium-dioxide'},
    malaysiaChlorideProcessContractJson: JSON.stringify(payload),
  }
}

const expectedGrades = [
  ['GRADE-M350','M-350',1,'/products/m-350/','Excellent hue and high gloss with strong hiding power.'],
  ['GRADE-M510','M-510',2,'/products/m-510/','TMP/TME-free multi-application grade with high brightness and durability.'],
  ['GRADE-M896','M-896',3,'/products/m-896/','Superior weather resistance with high gloss and excellent opacity for demanding exterior coatings.'],
  ['GRADE-M895','M-895',4,'/products/m-895/','High-opacity, high-gloss coatings grade with good weather resistance.'],
  ['GRADE-M200','M-200',5,'/products/m-200/','High-durability exterior plastics grade with strong anti-chalking performance.'],
  ['GRADE-M210','M-210',6,'/products/m-210/','High hiding power and easy dispersion for polyolefin masterbatch.'],
  ['GRADE-M340','M-340',7,'/products/m-340/','High whiteness with strong high-temperature anti-yellowing performance.'],
  ['GRADE-M886','M-886',8,'/products/m-886/','Bright-white plastics grade with excellent dispersion and processability.'],
] as const

describe('Chloride Process CMS contract', () => {
  it('preserves the page identity and all five explicit Grade relation attributes', () => {
    const page = toMalaysiaChlorideProcessPageDto(source())
    expect(page.identity).toEqual({
      pageId: 'PRODUCT-PROC-CL', siteScope: 'tio2-my', locale: 'en',
      path: '/products/chloride-process-titanium-dioxide/', schemaVersion: 'product-process-chloride-v0.1',
    })
    expect(page.modules.map(contentModule => contentModule.id)).toEqual(['CL-01','CL-02','CL-03','CL-04','CL-05'])
    expect(page.grades.map(grade => [
      grade.registeredPageId, grade.gradeNameOrModelCode, grade.position, grade.cleanUrl, grade.summary,
    ])).toEqual(expectedGrades)
  })

  it('normalizes transport order only from complete valid explicit positions', () => {
    const payload = structuredClone(contract)
    payload.grades.reverse()
    expect(toMalaysiaChlorideProcessPageDto(source(payload)).grades.map(grade => grade.position))
      .toEqual([1,2,3,4,5,6,7,8])
  })

  it.each([
    ['missing tuple', (value: Record<string, unknown>) => ((value.grades as unknown[]).pop())],
    ['duplicate tuple', (value: Record<string, unknown>) => ((value.grades as unknown[])[7] = structuredClone((value.grades as unknown[])[0]))],
    ['unknown Page ID', (value: Record<string, unknown>) => (((value.grades as Record<string, unknown>[])[0]!.registeredPageId) = 'GRADE-M2377')],
    ['Page ID/model mismatch', (value: Record<string, unknown>) => (((value.grades as Record<string, unknown>[])[0]!.gradeNameOrModelCode) = 'M-510')],
    ['Page ID/URL mismatch', (value: Record<string, unknown>) => (((value.grades as Record<string, unknown>[])[0]!.cleanUrl) = '/products/m-510/')],
    ['summary mismatch', (value: Record<string, unknown>) => (((value.grades as Record<string, unknown>[])[0]!.summary) = 'Better than every other grade.')],
    ['position mismatch', (value: Record<string, unknown>) => (((value.grades as Record<string, unknown>[])[0]!.position) = 2)],
  ])('rejects %s', (_name, mutate) => {
    const payload = structuredClone(contract) as unknown as Record<string, unknown>
    mutate(payload)
    expect(() => toMalaysiaChlorideProcessPageDto(source(payload))).toThrow(ChlorideProcessContractError)
  })

  it('rejects foreign/ambiguous scope, non-published status, wrong path and invalid payload', () => {
    expect(() => toMalaysiaChlorideProcessPageDto({...source(), siteScopes: {nodes: [{slug: 'tio2-a'}]}})).toThrow()
    expect(() => toMalaysiaChlorideProcessPageDto({...source(), siteScopes: {nodes: [{slug: 'tio2-my'}, {slug: 'tio2-a'}]}})).toThrow()
    expect(() => toMalaysiaChlorideProcessPageDto({...source(), status: 'draft'})).toThrow()
    expect(() => toMalaysiaChlorideProcessPageDto({...source(), publishingFields: {publicPath: '/products/m-350'}})).toThrow()
    expect(() => toMalaysiaChlorideProcessPageDto({...source(), malaysiaChlorideProcessContractJson: '{}'})).toThrow()
  })
})

describe('Chloride Process receiver context is source-only', () => {
  it('opens RFQ without Grade, Application, quantity or destination prefill', () => {
    expect(resolveMalaysiaRfqPrefill({source_page_id: 'PRODUCT-PROC-CL'}))
      .toEqual({values: {}, sourcePageId: 'PRODUCT-PROC-CL'})
  })

  it('opens Request Documents without visible prefill', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({source_page_id: 'PRODUCT-PROC-CL'}))
      .toEqual({values: {}, sourcePageId: 'PRODUCT-PROC-CL', marketId: null, prefillVisible: false})
  })
})
