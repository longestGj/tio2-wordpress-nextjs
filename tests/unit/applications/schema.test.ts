import {describe, expect, it} from 'vitest'

import {toApplicationPageDto} from '@/lib/applications/dto'
import {applicationPageInputSchema} from '@/lib/applications/schema'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import {
  applicationCategoryInput,
  applicationDetailInput,
  applicationHubInput,
} from '@/tests/fixtures/editorial/application-pages'

const resolveTarget: EditorialLinkResolver = (target) => {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  return canonical
    ? {
        ...canonical.target,
        title: target.id,
        path: canonical.path,
        href: null,
      }
    : null
}

describe('Application starting Product contract', () => {
  it('preserves Product starting-point order and resolves canonical Product links', () => {
    const input = structuredClone(applicationDetailInput)
    input.relationships.push(
      {type: 'product', id: 'TP-C120'},
      {type: 'product', id: 'TP-C100'},
    )
    input.startingProducts = [
      {
        productId: 'TP-C120',
        role: 'primary',
        label: 'Primary starting point',
        summaryHtml: '<p>Water-based wall-emulsion evaluation.</p>',
      },
      {
        productId: 'TP-C100',
        role: 'alternative',
        label: 'Alternative starting point',
        summaryHtml: '<p>Evaluate independently where its direction fits.</p>',
      },
    ]

    const dto = toApplicationPageDto(input, resolveTarget)

    expect(
      dto.startingProducts.map(({product, role}) => [product.id, role]),
    ).toEqual([
      ['TP-C120', 'primary'],
      ['TP-C100', 'alternative'],
    ])
    expect(dto.startingProducts[0]?.product.path).toBe('/products/tp-c120')
  })

  it('defaults the Hub to no starting Products', () => {
    const dto = toApplicationPageDto(
      structuredClone(applicationHubInput),
      resolveTarget,
    )
    expect(dto.startingProducts).toEqual([])
  })

  it('rejects two primary Detail entries', () => {
    const input = structuredClone(applicationDetailInput)
    input.relationships.push(
      {type: 'product', id: 'TP-C120'},
      {type: 'product', id: 'TP-C100'},
    )
    input.startingProducts = ['TP-C120', 'TP-C100'].map((productId) => ({
      productId,
      role: 'primary' as const,
      label: 'Evaluation starting point',
      summaryHtml: '<p>Fictional test summary.</p>',
    }))

    expect(applicationPageInputSchema.safeParse(input).success).toBe(false)
  })

  it('rejects starting Products on the Hub', () => {
    const input = structuredClone(applicationHubInput)
    input.startingProducts = [
      {
        productId: 'TP-P100',
        role: 'primary',
        label: 'Evaluation starting point',
        summaryHtml: '<p>Fictional test summary.</p>',
      },
    ]

    expect(applicationPageInputSchema.safeParse(input).success).toBe(false)
  })

  it('restricts Category entries to candidate roles and known relationships', () => {
    const input = structuredClone(applicationCategoryInput)
    input.startingProducts = [
      {
        productId: 'TP-C120',
        role: 'primary',
        label: 'Primary starting point',
        summaryHtml: '<p>Fictional test summary.</p>',
      },
    ]

    expect(applicationPageInputSchema.safeParse(input).success).toBe(false)
  })

  it('rejects a noncanonical Product even when it is also a relationship', () => {
    const input = structuredClone(applicationDetailInput)
    input.relationships.push({type: 'product', id: 'TP-X999'})
    input.startingProducts = [
      {
        productId: 'TP-X999',
        role: 'primary',
        label: 'Unknown starting point',
        summaryHtml: '<p>Fictional test summary.</p>',
      },
    ]

    const result = applicationPageInputSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map(({message}) => message)).toContain(
        'Starting Products must use a canonical Site A Product ID',
      )
    }
  })
})
