// @vitest-environment jsdom

import {render} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {MalaysiaResourceProcPage} from '@/components/sites/tio2-my/resources/malaysia-resource-proc-page'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json'
import {malaysiaResourceProcDto} from '@/tests/fixtures/tio2-my-resource-proc'

function setEligibility(
  contract: ReturnType<typeof structuredClone<typeof approvedContract>>,
  key: 'chloride_process' | 'sulfate_process',
  eligible: boolean,
) {
  const relation = contract.relations.find((item) => item.relationKey === key)!
  relation.routeStatus = eligible ? 'VERIFIED_PUBLIC' : 'NOT_IMPLEMENTED'
  relation.canonicalStatus = eligible ? 'VERIFIED' : 'NOT_VERIFIED'
  relation.publicEligibilityStatus = eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE'
}

describe('RES-PROC controlled actions', () => {
  it.each([
    [false, false, 0], [true, false, 0], [false, true, 0], [true, true, 2],
  ] as const)('renders Process links atomically for chloride=%s sulfate=%s', (chloride, sulfate, expected) => {
    const contract = structuredClone(approvedContract)
    setEligibility(contract, 'chloride_process', chloride)
    setEligibility(contract, 'sulfate_process', sulfate)
    const {container} = render(<MalaysiaResourceProcPage page={malaysiaResourceProcDto(contract)} />)

    expect(container.querySelectorAll('[data-process-action]')).toHaveLength(expected)
    expect(container.textContent).not.toMatch(/coming soon|contact us|disabled/iu)
  })

  it('renders Products independently of the Process pair', () => {
    const contract = structuredClone(approvedContract)
    const products = contract.relations.find((item) => item.relationKey === 'products_primary')!
    products.publicEligibilityStatus = 'REVOKED'
    setEligibility(contract, 'chloride_process', true)
    setEligibility(contract, 'sulfate_process', true)

    const {container} = render(<MalaysiaResourceProcPage page={malaysiaResourceProcDto(contract)} />)
    expect(container.querySelector('[data-products-action]')).toBeNull()
    expect(container.querySelectorAll('[data-process-action]')).toHaveLength(2)
  })

  it('binds seven exact external links and source-dependent action adjacency', () => {
    const page = malaysiaResourceProcDto()
    const {container} = render(<MalaysiaResourceProcPage page={page} />)
    const links = [...container.querySelectorAll('[data-external-source]')]

    expect(links).toHaveLength(7)
    expect(links.map((item) => ({
      label: item.textContent,
      href: item.getAttribute('href'),
    }))).toEqual(page.externalSources.map((source) => ({
      label: source.approvedLabel,
      href: source.approvedUrl,
    })))
    expect(links.every((item) => item.getAttribute('rel') === 'noopener noreferrer')).toBe(true)
  })

  it('omits the application evidence block when one required source is revoked', () => {
    const contract = structuredClone(approvedContract)
    contract.externalSources.find((item) => item.sourceKey === 'lb_blr886')!.evidenceStatus = 'REVOKED'
    const {container} = render(<MalaysiaResourceProcPage page={malaysiaResourceProcDto(contract)} />)
    const overlap = container.querySelector('[data-res-proc-module="APPLICATION_OVERLAP"]')!

    expect(overlap.textContent).toContain(contract.applicationOverlap.heading)
    expect(overlap.textContent).not.toContain('BLR-886')
    expect(overlap.querySelectorAll('a')).toHaveLength(0)
  })
})
