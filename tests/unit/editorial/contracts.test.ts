import {describe, expect, it} from 'vitest'

import {toApplicationPageDto, ApplicationContractError} from '@/lib/applications/dto'
import {applicationCategoryInput, applicationDetailInput, applicationHubInput} from '@/tests/fixtures/editorial/application-pages'
import {toTechnicalResourcePageDto, ResourceContractError} from '@/lib/resources/dto'
import {resourceArticleInput, resourceHubInput} from '@/tests/fixtures/editorial/resource-pages'

const resolveTarget = ({type, id}: {type: 'product'|'application'|'resource'; id: string}) => {
  const path = type === 'product' ? `/products/${id.toLowerCase()}/` : `/${type}s/${id}/`
  return {type, id, title: `Synthetic ${id}`, path, href: path}
}
const clone = <T>(value: T): T => structuredClone(value)

describe('shared editorial page contracts', () => {
  it('normalizes complete application levels and stable relationship keys deterministically', () => {
    const input = clone(applicationDetailInput) as any
    input.identity.path = '/applications/water-based-paint/'
    input.relationships = [...input.relationships].reverse()
    const first = toApplicationPageDto(input, resolveTarget)
    const second = toApplicationPageDto(input, resolveTarget)
    expect(first).toEqual(second)
    expect(first.identity).toMatchObject({id: 'water-based-paint', level: 'detail', parentId: 'coatings', path: '/applications/water-based-paint', modified: '2026-08-27T08:00:00.000Z'})
    expect(first.relationships.map((link) => `${link.type}:${link.id}`)).toEqual(['product:TP-S100', 'resource:article-01'])
    expect(first.relationships.every((link) => link.path === link.href && !link.path.endsWith('/'))).toBe(true)
  })

  it.each([applicationHubInput, applicationCategoryInput, applicationDetailInput])('accepts complete application page identity %s', (input) => {
    expect(toApplicationPageDto(clone(input), resolveTarget).identity.id).toBe(input.identity.id)
  })

  it('enforces application identity, hierarchy, section, FAQ, CTA, and strict-field rules', () => {
    const malformed = clone(applicationCategoryInput) as any
    malformed.identity.path = '/resources/coatings'
    expect(() => toApplicationPageDto(malformed, resolveTarget)).toThrow(ApplicationContractError)
    const mismatchedSlug = clone(applicationCategoryInput) as any
    mismatchedSlug.identity.path = '/applications/not-coatings'
    expect(() => toApplicationPageDto(mismatchedSlug, resolveTarget)).toThrow(ApplicationContractError)
    const missingParent = clone(applicationCategoryInput) as any
    missingParent.identity.parentId = null
    expect(() => toApplicationPageDto(missingParent, resolveTarget)).toThrow(ApplicationContractError)
    const incomplete = clone(applicationHubInput) as any
    incomplete.bodySections = incomplete.bodySections.slice(0, 1)
    expect(() => toApplicationPageDto(incomplete, resolveTarget)).toThrow(ApplicationContractError)
    const faqs = clone(applicationHubInput) as any
    faqs.faqs = faqs.faqs.slice(0, 3)
    expect(() => toApplicationPageDto(faqs, resolveTarget)).toThrow(ApplicationContractError)
    const cta = clone(applicationHubInput) as any
    cta.ctas[0].kind = 'download-tds'
    expect(() => toApplicationPageDto(cta, resolveTarget)).toThrow(ApplicationContractError)
    const privateField = clone(applicationHubInput) as any
    privateField.tdsUrl = 'https://private.example/controlled.pdf'
    expect(() => toApplicationPageDto(privateField, resolveTarget)).toThrow(ApplicationContractError)
  })

  it('normalizes complete resource pages and rejects incomplete required sections', () => {
    const input = clone(resourceArticleInput) as any
    input.identity.path = '/resources/article-01/'
    input.relationships = [...input.relationships].reverse()
    const dto = toTechnicalResourcePageDto(input, resolveTarget)
    expect(dto.identity).toMatchObject({id: 'article-01', kind: 'article', path: '/resources/article-01', modified: '2026-08-27T08:00:00.000Z'})
    expect(dto.relationships.map((link) => `${link.type}:${link.id}`)).toEqual(['product:TP-S100', 'application:coatings'])
    const mismatchedSlug = clone(resourceArticleInput) as any
    mismatchedSlug.identity.path = '/resources/not-article-01'
    expect(() => toTechnicalResourcePageDto(mismatchedSlug, resolveTarget)).toThrow(ResourceContractError)
    const incomplete = clone(resourceHubInput) as any
    incomplete.evaluationMethod = []
    expect(() => toTechnicalResourcePageDto(incomplete, resolveTarget)).toThrow(ResourceContractError)
    const unknown = clone(resourceHubInput) as any
    unknown.approval = 'private'
    expect(() => toTechnicalResourcePageDto(unknown, resolveTarget)).toThrow(ResourceContractError)
  })
})
