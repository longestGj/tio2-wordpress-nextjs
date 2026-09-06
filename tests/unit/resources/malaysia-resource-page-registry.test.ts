import {describe, expect, it} from 'vitest'

import {malaysiaResourceMappingAllowsPublic} from '@/lib/wordpress/resource-page-registry'

describe('controlled Malaysia Resource Page Registry mapping', () => {
  it('allows only the current approved Page ID/status/path tuple', () => {
    expect(malaysiaResourceMappingAllowsPublic(
      'RES-ORIGIN',
      'APPROVED_PRD_V0.3',
      '/resources/non-china-titanium-dioxide/',
    )).toBe(true)
    expect(malaysiaResourceMappingAllowsPublic(
      'RES-ORIGIN',
      'PUBLIC_ELIGIBLE',
      '/resources/non-china-titanium-dioxide/',
    )).toBe(false)
    expect(malaysiaResourceMappingAllowsPublic(
      'RES-ORIGIN',
      'APPROVED_PRD_V0.3',
      '/resources/wrong/',
    )).toBe(false)
    expect(malaysiaResourceMappingAllowsPublic(
      'RES-PROC',
      'APPROVED_PRD_V0.3',
      '/resources/chloride-vs-sulfate-titanium-dioxide/',
    )).toBe(true)
  })

  it.each([
    ['RES-CHEMOURS', 'NEW_PAGE_CANDIDATE', '/resources/chemours-titanium-dioxide-alternatives/'],
    ['RES-R706', 'NEW_PAGE_CANDIDATE', '/resources/ti-pure-r-706-alternative/'],
    ['RES-TRADE-EU', 'PLANNED_CONTENT', '/resources/eu-titanium-dioxide-anti-dumping-duty/'],
  ])('keeps non-public registry tuple %s fail-closed', (pageId, status, path) => {
    expect(malaysiaResourceMappingAllowsPublic(pageId, status, path)).toBe(false)
  })
})
