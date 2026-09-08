import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaChlorideProcessPage} from '@/components/sites/tio2-my/products/malaysia-chloride-process-page'
import {malaysiaChlorideProcessDto} from '@/tests/fixtures/tio2-my-product-process-chloride'

describe('PRODUCT-PROC-CL template', () => {
  it('renders the five approved modules and exact eight-Grade directory in order', () => {
    const page = malaysiaChlorideProcessDto()
    const markup = renderToStaticMarkup(<MalaysiaChlorideProcessPage page={page} />)

    expect(Array.from(markup.matchAll(/data-cl-module="([^"]+)"/gu), match => match[1]))
      .toEqual(['CL-01', 'CL-02', 'CL-03', 'CL-04', 'CL-05'])
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(Array.from(markup.matchAll(/data-grade-page-id="([^"]+)"/gu), match => match[1]))
      .toEqual(page.grades.map(grade => grade.registeredPageId))
    for (const grade of page.grades) {
      expect(markup).toContain(`href="${grade.cleanUrl}"`)
      expect(markup).toContain(grade.summary)
    }
  })

  it('keeps source-only conversion attribution and native fragment semantics', () => {
    const markup = renderToStaticMarkup(
      <MalaysiaChlorideProcessPage page={malaysiaChlorideProcessDto()} />,
    )

    expect(markup).toContain('href="#explore-chloride-process-grades"')
    expect(markup).toContain('id="explore-chloride-process-grades"')
    expect(markup).toContain('tabindex="-1"')
    expect(markup.match(/data-source-page="PRODUCT-PROC-CL"/gu)?.length).toBeGreaterThanOrEqual(5)
    expect(markup).not.toMatch(/(?:grade_id|application_id|quantity|destination|document_type)=/u)
  })

  it('does not invent page-owned forms, images, FAQs, tables or dynamic states', () => {
    const markup = renderToStaticMarkup(
      <MalaysiaChlorideProcessPage page={malaysiaChlorideProcessDto()} />,
    )
    const main = markup.match(/<main[\s\S]*<\/main>/u)?.[0] ?? ''
    expect(main).not.toMatch(/<(?:form|img|table|details)(?:\s|>)/u)
    expect(main).not.toMatch(/data-(?:loading|error|empty|success|filter|selector)/u)
  })
})
