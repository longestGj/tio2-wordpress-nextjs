import {describe, expect, it} from 'vitest'

import {
  ProductContractError,
  toProductPageDto,
} from '@/lib/products/dto'
import {validProductPageInput} from '@/tests/fixtures/product-page'

const fixture = () => structuredClone(validProductPageInput)

describe('Product DTO normalizer', () => {
  it('normalizes strings, GMT timestamps, paths, links, and property order deterministically', () => {
    const input = fixture()
    input.identity.title = '  TIOVAR TP-Z911 Rutile Titanium Dioxide  '
    input.identity.path = '/products/tp-z911/'
    input.recommendedApplications[0].href = '/applications/exterior-architectural-coatings/'
    input.relatedLinks.products[0].href = '/products/tp-z912/'
    input.typicalProperties = [
      input.typicalProperties[2],
      input.typicalProperties[0],
      input.typicalProperties[1],
    ]

    const first = toProductPageDto(input)
    const second = toProductPageDto(input)

    expect(first).toEqual(second)
    expect(first.identity).toMatchObject({
      title: 'TIOVAR TP-Z911 Rutile Titanium Dioxide',
      path: '/products/tp-z911',
      modified: '2026-08-26T08:30:00.000Z',
    })
    expect(first.recommendedApplications[0].href).toBe(
      '/applications/exterior-architectural-coatings',
    )
    expect(first.relatedLinks.products[0].href).toBe('/products/tp-z912')
    expect(first.typicalProperties.map(({displayOrder}) => displayOrder)).toEqual([1, 2, 3])
  })

  it('sanitizes every rich-text field before returning the render contract', () => {
    const input = fixture()
    input.hero.quickAnswer = input.hero.quickAnswer.replace(
      '</p>',
      '<script>alert(1)</script></p>',
    )
    input.evidenceHtml = '<p onclick="steal()">Evidence <em>boundary</em>.</p><iframe src="https://evil.test"></iframe>'
    input.faqs[0].answerHtml = '<p>Answer <img src="https://tracker.test/pixel.gif">text.</p>'
    input.disclaimerHtml = '<form action="https://evil.test"><p>Required disclaimer.</p></form>'

    const dto = toProductPageDto(input)
    const serialized = JSON.stringify(dto)

    expect(dto.evidenceHtml).toBe('<p>Evidence <em>boundary</em>.</p>')
    expect(dto.faqs[0].answerHtml).toBe('<p>Answer text.</p>')
    expect(dto.disclaimerHtml).toBe('<p>Required disclaimer.</p>')
    expect(serialized).not.toMatch(/<script| onclick=|<iframe|<form|<img/)
  })

  it('throws ProductContractError with issue paths instead of returning a partial DTO', () => {
    const input = fixture() as Record<string, unknown>
    delete (input.hero as Record<string, unknown>).problemHeadline

    expect(() => toProductPageDto(input)).toThrow(ProductContractError)
    try {
      toProductPageDto(input)
      throw new Error('Expected ProductContractError')
    } catch (error) {
      expect(error).toBeInstanceOf(ProductContractError)
      expect((error as ProductContractError).issues).toContain('hero.problemHeadline')
    }
  })

  it('rejects rich text that becomes empty after sanitization', () => {
    const input = fixture()
    input.evidenceHtml = '<script>only unsafe content</script><img src="x">'

    expect(() => toProductPageDto(input)).toThrow(ProductContractError)
  })
})
