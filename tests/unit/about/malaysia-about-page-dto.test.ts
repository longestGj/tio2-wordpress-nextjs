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

  it('projects an independently restricted export fact without failing the page', () => {
    const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource({
      evidenceState: 'partial',
      authorizations: {'export.port': 'restricted'},
    }))
    expect(dto.hero.paragraphs.map(({id}) => id)).not.toEqual(expect.arrayContaining([
      'hero.paragraph.2', 'hero.paragraph.3', 'hero.paragraph.4',
    ]))
    expect(dto.whoWeAre.facts.map(({label}) => label)).not.toContain('Export Coordination')
    expect(dto.hero.visualVisible).toBe(false)
    expect(dto.seo.description).toBeNull()
    expect(dto.schema.organizationDescription).not.toContain('Port Klang')
    expect(dto.schema.organizationDescription).toContain('35,000 metric tons')
  })

  it('projects independently restricted areas and location facts', () => {
    const areas = toMalaysiaAboutPageDto(malaysiaAboutPageSource({
      evidenceState: 'partial', authorizations: {'areas.served': 'restricted'},
    }))
    expect(areas.markets).toBeNull()
    expect(areas.companyFacts.items.map(({label}) => label)).not.toContain('Markets')
    expect(areas.schema.areas).toEqual([])
    expect(areas.hero.visualVisible).toBe(false)

    const location = toMalaysiaAboutPageDto(malaysiaAboutPageSource({
      evidenceState: 'partial', authorizations: {'location.full': 'restricted'},
    }))
    expect(location.hero.h1).toBe('About TiO2 Malaysia')
    expect(location.whoWeAre.facts.map(({label}) => label)).not.toContain('Location')
    expect(location.companyFacts.items.map(({label}) => label)).not.toContain('Base')
    expect(location.schema.address).toBeNull()
  })

  it('treats not_public like restricted and accepts multiple arbitrary facts', () => {
    const notPublic = toMalaysiaAboutPageDto(malaysiaAboutPageSource({
      evidenceState: 'partial', authorizations: {'documents.support': 'not_public'},
    }))
    expect(notPublic.documentation).toBeNull()
    expect(notPublic.hero.paragraphs.map(({id}) => id)).not.toEqual(expect.arrayContaining([
      'hero.paragraph.2', 'hero.paragraph.3', 'hero.paragraph.4', 'hero.paragraph.6',
    ]))

    const combined = toMalaysiaAboutPageDto(malaysiaAboutPageSource({
      evidenceState: 'restricted',
      authorizations: {
        'organization.name': 'restricted',
        'export.port': 'not_public',
        'compliance.support': 'restricted',
        'areas.served': 'not_public',
      },
    }))
    expect(combined.hero).toMatchObject({h1: 'About TiO2 Malaysia', eyebrow: 'ABOUT TIO2 MALAYSIA', visualVisible: false})
    expect(combined.whoWeAre.facts.map(({label}) => label)).not.toContain('Operating Company')
    expect(combined.markets).toBeNull()
    expect(combined.schema.organizationName).toBeNull()
  })
})
