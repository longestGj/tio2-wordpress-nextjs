// @vitest-environment jsdom

import {render} from '@testing-library/react'
import {renderToStaticMarkup} from 'react-dom/server'
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

  it.each([
    [['lb_blr886']],
    [['lb_lr108']],
    [['tronox_portfolio']],
    [['lb_blr886', 'lb_lr108']],
    [['lb_blr886', 'tronox_portfolio']],
    [['lb_lr108', 'tronox_portfolio']],
    [['lb_blr886', 'lb_lr108', 'tronox_portfolio']],
  ] as const)('server HTML atomically omits application evidence with revoked sources %j', (revokedKeys) => {
    const contract = structuredClone(approvedContract)
    for (const key of revokedKeys) {
      contract.externalSources.find((item) => item.sourceKey === key)!.evidenceStatus = 'REVOKED'
    }
    const html = renderToStaticMarkup(<MalaysiaResourceProcPage page={malaysiaResourceProcDto(contract)} />)
    const document = new DOMParser().parseFromString(html, 'text/html')
    const overlap = document.querySelector('[data-res-proc-module="APPLICATION_OVERLAP"]')!

    expect(overlap.textContent).toBe(`${contract.applicationOverlap.eyebrow}${contract.applicationOverlap.heading}`)
    expect(overlap.textContent).not.toContain('The supporting evidence for this section is not currently available.')
    for (const item of contract.applicationOverlap.evidenceItems) {
      expect(overlap.textContent).not.toContain(item.statement)
    }
    expect(overlap.querySelectorAll('a')).toHaveLength(0)
    for (const key of revokedKeys) {
      const source = contract.externalSources.find((item) => item.sourceKey === key)!
      expect(document.body.textContent).not.toContain(source.approvedLabel)
      expect(html).not.toContain(source.approvedUrl)
    }
    expect([...document.querySelectorAll('[data-res-proc-module]')]).toHaveLength(14)
  })
})
