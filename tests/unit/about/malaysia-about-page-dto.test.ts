import {describe, expect, it} from 'vitest'

import {CrossSiteContentError} from '@/lib/wordpress/types'
import {AboutPageContractError, toMalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-dto'
import {malaysiaAboutPageSource} from '@/tests/fixtures/tio2-my-about-page'

describe('ABOUT-001 DTO', () => {
  it('accepts only the exact approved singleton projection', () => {
    const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource())
    expect(dto.identity).toMatchObject({siteId: 'tio2-my', path: '/about', status: 'publish'})
    expect(dto.globalChrome.navigation.find(({targetPageId}) => targetPageId === 'ABOUT-001')?.href).toBe('/about/')
  })

  it('rejects cross-scope and modified contracts', () => {
    expect(() => toMalaysiaAboutPageDto(malaysiaAboutPageSource({scope: 'tio2-a'}))).toThrow(CrossSiteContentError)
    expect(() => toMalaysiaAboutPageDto(malaysiaAboutPageSource({tamper: true}))).toThrow(AboutPageContractError)
    expect(() => toMalaysiaAboutPageDto(malaysiaAboutPageSource({tamperEvidence: true}))).toThrow(AboutPageContractError)
  })

  it('projects sufficient, partial and restricted evidence without placeholders', () => {
    const sufficient = toMalaysiaAboutPageDto(malaysiaAboutPageSource())
    expect(sufficient.evidence.state).toBe('sufficient')
    expect(sufficient.hero.paragraphs).toHaveLength(6)
    expect(sufficient.whoWeAre.facts).toHaveLength(7)
    expect(sufficient.seo.description).toContain('IKHLAS TITANIUM (MALAYSIA) SDN. BHD.')
    expect(sufficient.schema.organizationDescription).toContain('35,000 metric tons')
    expect(sufficient.schema.address).not.toBeNull()

    const partial = toMalaysiaAboutPageDto(malaysiaAboutPageSource({evidenceState: 'partial'}))
    expect(partial.evidence.state).toBe('partial')
    expect(partial.hero.paragraphs).toHaveLength(6)
    expect(partial.whoWeAre.facts.map(({label}) => label)).not.toEqual(expect.arrayContaining([
      'Annual Supply', 'Markets Served', 'Customer Base',
    ]))
    expect(partial.schema.organizationDescription).not.toContain('35,000 metric tons')
    expect(partial.seo.description).toBe(sufficient.seo.description)
    expect(partial.schema.address).not.toBeNull()

    const restricted = toMalaysiaAboutPageDto(malaysiaAboutPageSource({evidenceState: 'restricted'}))
    expect(restricted.evidence.state).toBe('restricted')
    expect(restricted.hero.paragraphs.map(({id}) => id)).not.toContain('hero.paragraph.1')
    expect(restricted.whoWeAre.facts.map(({label}) => label)).not.toContain('Location')
    expect(restricted.seo.description).toBeNull()
    expect(restricted.schema.organizationDescription).toBeNull()
    expect(restricted.schema.address).toBeNull()
  })

  it('rejects non-atomic output authorization', () => {
    const source = malaysiaAboutPageSource({evidenceState: 'restricted'})
    const evidence = JSON.parse(source.malaysiaAboutPageEvidenceJson) as {
      facts: Array<{key: string; authorization: string}>
    }
    const output = evidence.facts.find(({key}) => key === 'metadata.description')
    if (!output) throw new Error('metadata.description fixture missing')
    output.authorization = 'user_approved_public'
    expect(() => toMalaysiaAboutPageDto({
      ...source,
      malaysiaAboutPageEvidenceJson: JSON.stringify(evidence),
    })).toThrow(AboutPageContractError)

    const unsupported = malaysiaAboutPageSource()
    const unsupportedEvidence = JSON.parse(unsupported.malaysiaAboutPageEvidenceJson) as {
      evidenceState: string
      facts: Array<{key: string; authorization: string}>
    }
    unsupportedEvidence.evidenceState = 'restricted'
    unsupportedEvidence.facts.find(({key}) => key === 'areas.served')!.authorization = 'restricted'
    expect(() => toMalaysiaAboutPageDto({
      ...unsupported,
      malaysiaAboutPageEvidenceJson: JSON.stringify(unsupportedEvidence),
    })).toThrow(AboutPageContractError)
  })
})
