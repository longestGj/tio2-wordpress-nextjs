// @vitest-environment jsdom

import {cleanup, render, within} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {TechnicalResourcePageRenderer} from '@/components/resources/technical-resource-page'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import type {SiteAResourceContentManifest} from '@/lib/resources/content-manifest'
import {toTechnicalResourcePageDto} from '@/lib/resources/dto'
import {resolveResourcePresentation} from '@/lib/resources/presentation'
import approvedResourceManifestJson from '@/tests/fixtures/editorial/site-a-resources.approved.json'

const manifest = approvedResourceManifestJson as unknown as SiteAResourceContentManifest

const resolveTarget: EditorialLinkResolver = (target) => {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  return canonical
    ? {
        ...canonical.target,
        title: `Approved ${target.type} ${target.id}`,
        path: canonical.path,
        href: null,
      }
    : null
}

function resourceFixture(id: string) {
  const record = manifest.records.find((candidate) => candidate.identity.id === id)
  if (!record) throw new Error(`Missing approved Resource fixture: ${id}`)
  return toTechnicalResourcePageDto(structuredClone(record), resolveTarget)
}

afterEach(cleanup)

describe('approved Site A Resource content coverage', () => {
  it.each(manifest.records.map(({identity}) => identity.id))(
    'renders approved %s as a complete, non-clickable review composition',
    (id) => {
      const resource = resourceFixture(id)
      const presentation = resolveResourcePresentation(id)
      if (!presentation) throw new Error(`Missing Resource presentation: ${id}`)
      const {container} = render(<TechnicalResourcePageRenderer resource={resource} preview />)
      const page = container.querySelector<HTMLElement>('[data-resource-mode]')

      expect(container.querySelectorAll('h1')).toHaveLength(1)
      expect(page?.getAttribute('data-resource-mode')).toBe(presentation.mode)
      expect(container.querySelector('[data-editorial-section="faq"]')).not.toBeNull()
      expect(container.querySelector('[data-editorial-section="technical-disclaimer"]')).not.toBeNull()
      expect(container.querySelector('[data-resource-section="cta-group"]')).not.toBeNull()
      expect(container.querySelectorAll('section:empty')).toHaveLength(0)

      if (presentation.mode === 'hub') {
        expect(page?.querySelector('[data-resource-comparison]')).toBeNull()
        expect(page?.querySelector('[data-resource-section="overview"]')).toBeNull()
      } else {
        const guide = within(page as HTMLElement).getByRole('navigation', {
          name: 'In this guide',
        })
        const links = within(guide).getAllByRole('link')
        expect(links).toHaveLength(6)
        for (const link of links) {
          const target = link.getAttribute('href')
          expect(target).toMatch(/^#resource-/u)
          expect(page?.querySelector(target as string)).not.toBeNull()
        }
      }

      if (id === 'article-04') {
        expect(page?.querySelectorAll('[data-resource-example]')).toHaveLength(
          resource.comparisonTable?.rows.length,
        )
      } else if (id === 'article-07') {
        expect(page?.querySelector('[data-resource-stage]')).not.toBeNull()
        expect(page?.querySelector('[data-resource-scorecard-desktop]')).not.toBeNull()
      } else if (resource.comparisonTable) {
        const comparison = page?.querySelector<HTMLElement>('[data-resource-comparison]')
        expect(comparison).not.toBeNull()
        expect(within(comparison as HTMLElement).getAllByRole('columnheader')).toHaveLength(
          resource.comparisonTable.columns.length,
        )
        expect(within(comparison as HTMLElement).getAllByRole('row')).toHaveLength(
          resource.comparisonTable.rows.length + 1,
        )
      }

      const hasProductRelationship = resource.relationships.some(
        ({type}) => type === 'product',
      )
      expect(page?.querySelector('[data-resource-action="request-tds"]') !== null).toBe(
        hasProductRelationship,
      )
      expect(page?.querySelector('[data-resource-section="related-content"] a')).toBeNull()
    },
  )
})
