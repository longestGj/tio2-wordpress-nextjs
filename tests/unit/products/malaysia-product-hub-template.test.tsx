import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {toMalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-dto'
import {
  malaysiaProductHubSource,
  productHubReadiness,
} from '@/tests/fixtures/tio2-my-product-hub'
import eligibility from '@/wordpress/plugins/tio2-site-model/config/tio2-my-prerelease-public-paths.json'
import productContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-hub.json'

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

function exactPrereleaseReadiness(): Record<string, boolean> {
  return Object.fromEntries(productContract.routeRegistry.map((target) => {
    const route = eligibility.routes.find(({pageId}) => pageId === target.targetPageId)
    return [target.targetPageId, route?.path === target.href && route.canonical === new URL(target.href, 'https://tio2malaysia.com').href]
  }))
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

  it('renders exactly 14 directory Grade links, two Process links and three support links when ready', async () => {
    const markup = await renderHub(exactPrereleaseReadiness())
    const directory = markup.match(/data-module="grade-directory"[\s\S]*?data-module="evaluation"/u)?.[0] ?? ''

    expect(directory.match(/<a[^>]+data-grade-action=/gu)).toHaveLength(14)
    expect(markup.match(/<a[^>]+data-process-route=/gu)).toHaveLength(2)
    expect(markup.match(/<a[^>]+data-support-action=/gu)).toHaveLength(3)
  })
})
