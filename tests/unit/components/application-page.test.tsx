// @vitest-environment jsdom

import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {ApplicationPageRenderer} from '@/components/applications/application-page'
import {toApplicationPageDto} from '@/lib/applications/dto'
import type {ApplicationPageDto} from '@/lib/applications/types'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import {
  applicationCategoryInput,
  applicationDetailInput,
  applicationHubInput,
} from '@/tests/fixtures/editorial/application-pages'

const EXPECTED_BASE_ORDER = [
  'hero',
  'direct-answer',
  'customer-context',
  'selection-factors',
  'body-section-overview',
  'body-section-next-steps',
  'powder-data-limitation',
  'validation-plan',
  'customer-inputs',
] as const

const resolveTarget: EditorialLinkResolver = (target) => ({
  ...target,
  title: `Resolved ${target.type} ${target.id}`,
  path:
    target.type === 'product'
      ? `/products/${target.id.toLowerCase()}`
      : target.type === 'resource'
        ? `/resources/${target.id}`
        : `/applications/${target.id}`,
  href: target.id === 'article-01' ? '/resources/article-01' : null,
})

function applicationFixture(
  level: ApplicationPageDto['identity']['level'],
): ApplicationPageDto {
  const input =
    level === 'hub'
      ? applicationHubInput
      : level === 'category'
        ? applicationCategoryInput
        : applicationDetailInput
  return toApplicationPageDto(input, resolveTarget)
}

afterEach(cleanup)

describe('ApplicationPageRenderer', () => {
  it.each(['hub', 'category', 'detail'] as const)(
    'selects the controlled %s mode and preserves the complete decision flow',
    (level) => {
      const application = applicationFixture(level)
      const {container} = render(
        <ApplicationPageRenderer application={application} />,
      )
      const page = container.querySelector<HTMLElement>('[data-application-mode]')
      const sections = Array.from(
        container.querySelectorAll<HTMLElement>('section[data-application-section]'),
      )
      const optionalSections = [
        ...(level === 'detail' ? [] : ['child-navigation']),
        'related-content',
        'faq',
        'cta-group',
        'technical-disclaimer',
      ]

      expect(page?.dataset.applicationMode).toBe(level)
      expect(sections.map((section) => section.dataset.applicationSection)).toEqual([
        ...EXPECTED_BASE_ORDER,
        ...optionalSections,
      ])
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: application.hero.headline,
        }),
      ).not.toBeNull()
      expect(screen.queryByRole('heading', {level: 1, name: application.identity.title})).toBeNull()

      for (const section of sections) {
        const labelledBy = section.getAttribute('aria-labelledby')
        const heading = labelledBy ? document.getElementById(labelledBy) : null
        expect(labelledBy).toBeTruthy()
        expect(heading?.matches('h1, h2')).toBe(true)
        expect(heading ? section.contains(heading) : false).toBe(true)
      }
    },
  )

  it('shows the exact direct answer immediately after the hero and keeps FAQ parity', () => {
    const application = applicationFixture('hub')
    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )
    const hero = container.querySelector('[data-application-section="hero"]')
    const directAnswer = container.querySelector<HTMLElement>(
      '[data-application-section="direct-answer"]',
    )
    const faqItems = Array.from(
      container.querySelectorAll<HTMLElement>('[data-editorial-faq-item]'),
    )

    expect(hero?.nextElementSibling).toBe(directAnswer)
    expect(
      within(directAnswer as HTMLElement).getByRole('heading', {
        level: 2,
        name: 'Direct Answer',
      }),
    ).not.toBeNull()
    expect(directAnswer?.innerHTML).toContain(application.hero.directAnswer)
    expect(directAnswer?.hidden).toBe(false)
    expect(faqItems).toHaveLength(application.faqs.length)
    expect(faqItems.map((item) => item.textContent)).toEqual(
      application.faqs.map((faq) => `${faq.question}Use a fictional, representative test plan.`),
    )
  })

  it('derives child cards and relationships only from DTO links without creating dead anchors', () => {
    const application = applicationFixture('hub')
    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )
    const childNavigation = container.querySelector<HTMLElement>(
      '[data-application-section="child-navigation"]',
    )
    const related = container.querySelector<HTMLElement>(
      '[data-application-section="related-content"]',
    )

    expect(childNavigation?.textContent).toContain(application.children[0]?.title)
    expect(childNavigation?.querySelectorAll('a')).toHaveLength(0)
    expect(related?.textContent).toContain(application.relationships[0]?.title)
    expect(related?.textContent).toContain(application.relationships[1]?.title)
    expect(related?.querySelectorAll('a')).toHaveLength(1)
    expect(related?.querySelector('a')?.getAttribute('href')).toBe(
      '/resources/article-01',
    )
  })

  it('uses only DTO CTA labels and hrefs and keeps the disclaimer visible', () => {
    const application = applicationFixture('detail')
    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )
    const ctaGroup = container.querySelector<HTMLElement>(
      '[data-application-section="cta-group"]',
    )
    const links = within(ctaGroup as HTMLElement).getAllByRole('link')
    const disclaimer = container.querySelector<HTMLElement>(
      '[data-application-section="technical-disclaimer"]',
    )

    expect(links.map((link) => link.textContent)).toEqual(
      application.ctas.map((cta) => cta.label),
    )
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      application.ctas.map((cta) => cta.href),
    )
    expect(disclaimer?.innerHTML).toContain(application.disclaimerHtml)
  })

  it('fails closed instead of rendering an unknown mode or a partial DTO', () => {
    const application = applicationFixture('hub')
    const {container, rerender} = render(
      <ApplicationPageRenderer
        application={{
          ...application,
          identity: {...application.identity, level: 'unknown'},
        } as never}
      />,
    )

    expect(container.childElementCount).toBe(0)

    rerender(
      <ApplicationPageRenderer
        application={{...application, decisionGuide: undefined} as never}
      />,
    )
    expect(container.childElementCount).toBe(0)

    rerender(
      <ApplicationPageRenderer
        application={{
          ...application,
          faqs: [{...application.faqs[0], answerHtml: undefined}],
        } as never}
      />,
    )
    expect(container.childElementCount).toBe(0)

    const category = applicationFixture('category')
    const incompleteApplications = [
      {
        ...category,
        identity: {...category.identity, parentId: undefined},
      },
      {...application, bodySections: application.bodySections.slice(0, 1)},
      {...application, faqs: application.faqs.slice(0, 3)},
      {
        ...application,
        decisionGuide: {
          ...application.decisionGuide,
          selectionFactors: application.decisionGuide.selectionFactors.slice(0, 2),
        },
      },
    ]

    for (const incomplete of incompleteApplications) {
      rerender(
        <ApplicationPageRenderer application={incomplete as never} />,
      )
      expect(container.childElementCount).toBe(0)
    }
  })
})
