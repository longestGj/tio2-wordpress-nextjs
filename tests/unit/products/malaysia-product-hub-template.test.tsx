import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {toMalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-dto'
import {
  malaysiaProductHubSource,
  productHubReadiness,
} from '@/tests/fixtures/tio2-my-product-hub'

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props),
}))

async function renderHub(readiness = productHubReadiness()) {
  const {MalaysiaProductHub} = await import(
    '@/components/sites/tio2-my/products/malaysia-product-hub'
  )
  return renderToStaticMarkup(
    <MalaysiaProductHub
      productHub={toMalaysiaProductHubDto(malaysiaProductHubSource(readiness))}
    />,
  )
}

describe('MalaysiaProductHub', () => {
  it('renders the approved server DOM order, all 14 summaries and all FAQ answers', async () => {
    const hub = toMalaysiaProductHubDto(malaysiaProductHubSource())
    const markup = await renderHub()
    const visibleText = markup.replaceAll('&#x27;', "'").replaceAll('&amp;', '&')
    const moduleOrder = Array.from(markup.matchAll(/data-module="([^"]+)"/gu), (match) => match[1])

    expect(moduleOrder).toEqual([
      'breadcrumb',
      'hero',
      'grade-selector',
      'process',
      'grade-directory',
      'evaluation',
      'support',
      'buyer-questions',
      'final-rfq',
    ])
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup).toContain(hub.seo.h1)
    for (const grade of hub.directory.groups.flatMap((group) => group.grades)) {
      expect(visibleText).toContain(grade.summary)
    }
    for (const faq of hub.buyerQuestions) {
      expect(visibleText).toContain(faq.question)
      expect(visibleText).toContain(faq.answer)
    }
    expect(markup).toContain('aria-current="page"')
    expect(markup).not.toMatch(/>\s*CURRENT\s*</u)
  })

  it('fails closed for unavailable external actions without removing stable content', async () => {
    const markup = await renderHub(productHubReadiness(false))

    expect(markup).toContain('data-module="process"')
    expect(markup).toContain('CR-901')
    expect(markup).not.toContain('data-process-route=')
    expect(markup).not.toContain('data-grade-action=')
    expect(markup).not.toContain('data-module="support"')
    expect(markup).toContain('Request a Quote for Your Requirements')
    expect(markup.match(/href="\/request-a-quote\//gu)?.length).toBeGreaterThanOrEqual(4)
  })

  it('renders only ready process, support and grade links', async () => {
    const readiness = productHubReadiness(false)
    readiness['PRODUCT-PROC-CL'] = true
    readiness['GRADE-M350'] = true
    readiness['MARKET-000'] = true
    const markup = await renderHub(readiness)

    expect(markup).toContain('data-process-route="PRODUCT-PROC-CL"')
    expect(markup).not.toContain('data-process-route="PRODUCT-PROC-SU"')
    expect(markup).toContain('data-grade-action="GRADE-M350"')
    expect(markup).not.toContain('data-grade-action="GRADE-M510"')
    expect(markup).toContain('data-support-action="MARKET-000"')
    expect(markup).not.toContain('data-support-action="APP-000"')
  })
})
