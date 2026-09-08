import {describe, expect, it} from 'vitest'

import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json'

describe('APP-000 approved contract', () => {
  it('preserves six ordered collections and all 30 source occurrences', () => {
    expect(contract.applications.map((item) => item.key)).toEqual(['COAT', 'PLAS', 'MB', 'INK', 'PAPER', 'SPECIALTY'])
    expect(contract.applications.map((item) => item.grades.length)).toEqual([8, 8, 7, 4, 2, 1])
    expect(contract.applications.flatMap((item) => item.grades)).toHaveLength(30)
    expect(contract.applications.at(-1)?.grades.at(-1)?.edgeId).toBe('APP000-EDGE-SPEC-01')
  })

  it('keeps only the approved five child routes and source-only RFQ path', () => {
    expect(contract.applications.filter((item) => 'targetPageId' in item).map((item) => item.targetPageId)).toEqual([
      'APP-COAT', 'APP-PLAS', 'APP-MB', 'APP-INK', 'APP-PAPER',
    ])
    expect(contract.hero.rfq.href).toBe('/request-a-quote/')
    expect(JSON.stringify(contract)).not.toContain('source_page_id')
  })
})
