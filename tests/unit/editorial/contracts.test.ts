import {describe, expect, it} from 'vitest'

import {toApplicationPageDto, ApplicationContractError} from '@/lib/applications/dto'
import {applicationCategoryInput, applicationDetailInput, applicationHubInput} from '@/tests/fixtures/editorial/application-pages'
import {toTechnicalResourcePageDto, ResourceContractError} from '@/lib/resources/dto'
import {resourceArticleInput, resourceHubInput} from '@/tests/fixtures/editorial/resource-pages'
import {addUnknownFixtureField, mutableFixture} from '@/tests/fixtures/editorial/mutable-fixture'

const resolveTarget = ({type, id}: {type: 'product'|'application'|'resource'; id: string}) => {
  const path = type === 'product' ? `/products/${id.toLowerCase()}/` : `/${type}s/${id}/`
  return {type, id, title: `Synthetic ${id}`, path, href: path}
}
const clone = <T>(value: T): T => structuredClone(value)

describe('shared editorial page contracts', () => {
  it('normalizes complete application levels and stable relationship keys deterministically', () => {
    const input = mutableFixture(applicationDetailInput)
    input.identity.path = '/applications/water-based-paint/'
    input.relationships = [...input.relationships].reverse()
    const first = toApplicationPageDto(input, resolveTarget)
    const second = toApplicationPageDto(input, resolveTarget)
    expect(first).toEqual(second)
    expect(first.identity).toMatchObject({id: 'water-based-paint', level: 'detail', parentId: 'coatings', path: '/applications/water-based-paint', modified: '2026-08-27T08:00:00.000Z'})
    expect(first.relationships.map((link) => `${link.type}:${link.id}`)).toEqual(['product:TP-X999', 'resource:article-01'])
    expect(first.relationships.every((link) => link.path === link.href && !link.path.endsWith('/'))).toBe(true)
  })

  it.each([applicationHubInput, applicationCategoryInput, applicationDetailInput])('accepts complete application page identity %s', (input) => {
    expect(toApplicationPageDto(clone(input), resolveTarget).identity.id).toBe(input.identity.id)
  })

  it('enforces application identity, hierarchy, section, FAQ, CTA, and strict-field rules', () => {
    const malformed = mutableFixture(applicationCategoryInput)
    malformed.identity.path = '/resources/coatings'
    expect(() => toApplicationPageDto(malformed, resolveTarget)).toThrow(ApplicationContractError)
    const mismatchedSlug = mutableFixture(applicationCategoryInput)
    mismatchedSlug.identity.path = '/applications/not-coatings'
    expect(() => toApplicationPageDto(mismatchedSlug, resolveTarget)).toThrow(ApplicationContractError)
    const missingParent = mutableFixture(applicationCategoryInput)
    addUnknownFixtureField(missingParent.identity, 'parentId', null)
    expect(() => toApplicationPageDto(missingParent, resolveTarget)).toThrow(ApplicationContractError)
    const incomplete = mutableFixture(applicationHubInput)
    incomplete.bodySections = incomplete.bodySections.slice(0, 1)
    expect(() => toApplicationPageDto(incomplete, resolveTarget)).toThrow(ApplicationContractError)
    const faqs = mutableFixture(applicationHubInput)
    faqs.faqs = faqs.faqs.slice(0, 3)
    expect(() => toApplicationPageDto(faqs, resolveTarget)).toThrow(ApplicationContractError)
    const cta = mutableFixture(applicationHubInput)
    cta.ctas[0].kind = 'download-tds'
    expect(() => toApplicationPageDto(cta, resolveTarget)).toThrow(ApplicationContractError)
    const privateField = addUnknownFixtureField(
      mutableFixture(applicationHubInput),
      'tdsUrl',
      'https://private.example/controlled.pdf',
    )
    expect(() => toApplicationPageDto(privateField, resolveTarget)).toThrow(ApplicationContractError)
  })

  it.each([
    ['private path', {title: 'Synthetic target', path: '/tds/current-sheet', href: '/tds/current-sheet'}],
    ['private href', {title: 'Synthetic target', path: '/resources/article-01', href: '/tds/current-sheet'}],
    ['prohibited title claim', {title: 'Competitor equivalent', path: '/resources/article-01', href: '/resources/article-01'}],
  ])('rejects a resolver-generated relationship with %s', (_label, fields) => {
    const unsafeResolver = ({type, id}: {type: 'product'|'application'|'resource'; id: string}) => ({type, id, ...fields})
    expect(() => toApplicationPageDto(clone(applicationHubInput), unsafeResolver)).toThrow(ApplicationContractError)
  })

  it('normalizes complete resource pages and rejects incomplete required sections', () => {
    const input = mutableFixture(resourceArticleInput)
    input.identity.path = '/resources/article-01/'
    input.relationships = [...input.relationships].reverse()
    const dto = toTechnicalResourcePageDto(input, resolveTarget)
    expect(dto.identity).toMatchObject({id: 'article-01', kind: 'article', path: '/resources/article-01', modified: '2026-08-27T08:00:00.000Z'})
    expect(dto.relationships.map((link) => `${link.type}:${link.id}`)).toEqual(['product:TP-X999', 'application:coatings'])
    const mismatchedSlug = mutableFixture(resourceArticleInput)
    mismatchedSlug.identity.path = '/resources/not-article-01'
    expect(() => toTechnicalResourcePageDto(mismatchedSlug, resolveTarget)).toThrow(ResourceContractError)
    const incomplete = mutableFixture(resourceHubInput)
    incomplete.evaluationMethod = []
    expect(() => toTechnicalResourcePageDto(incomplete, resolveTarget)).toThrow(ResourceContractError)
    const unknown = addUnknownFixtureField(mutableFixture(resourceHubInput), 'approval', 'private')
    expect(() => toTechnicalResourcePageDto(unknown, resolveTarget)).toThrow(ResourceContractError)
  })
})
