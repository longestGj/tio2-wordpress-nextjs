import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {
  malaysiaProductDetailSource,
  productDetailReadiness,
} from '@/tests/fixtures/tio2-my-product-detail'

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props),
}))

async function renderDetail(readiness = productDetailReadiness()) {
  const {MalaysiaProductDetail} = await import(
    '@/components/sites/tio2-my/products/malaysia-product-detail'
  )
  return renderToStaticMarkup(
    <MalaysiaProductDetail product={toMalaysiaProductDetailDto(malaysiaProductDetailSource(readiness))} />,
  )
}

describe('MalaysiaProductDetail shared template', () => {
  it('renders exact M-350 copy, 15 semantic rows and the minimum fail-closed order', async () => {
    const markup = await renderDetail()
    const order = Array.from(markup.matchAll(/data-module="([^"]+)"/gu), (match) => match[1])
    expect(order).toEqual([
      'breadcrumb', 'hero', 'facts', 'section-navigation',
      'positioning', 'applications', 'evaluation', 'technical',
    ])
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(
      'M-350 Rutile Titanium Dioxide Pigment',
    )
    expect(markup).toContain('General-grade rutile pigment')
    expect(markup).toContain('Evaluation Priorities')
    expect(markup.match(/<tr/gu)).toHaveLength(16)
    expect(markup).toContain('<th scope="row">TiO₂ content, %</th>')
    expect(markup).toContain('data-label="Standard"')
    expect(markup).toContain('data-label="Typical Value"')
    expect(markup).not.toContain('data-contextual-action=')
    expect(markup).not.toContain('data-module="documents"')
    expect(markup).not.toContain('data-module="markets"')
    expect(markup).not.toContain('data-module="related-grades"')
    expect(markup).not.toContain('data-module="sample"')
  })

  it('preserves shared Products current state and fixed Global Chrome RFQ', async () => {
    const markup = await renderDetail()
    expect(markup).toContain('aria-current="page"')
    expect(markup).not.toMatch(/>\s*CURRENT\s*</u)
    expect(markup.match(/href="\/request-a-quote\//gu)).toHaveLength(3)
    expect(markup).toContain('data-source-page="GRADE-M350"')
  })

  it('renders only resolver-approved contextual modules and scoped prefill', async () => {
    const readiness = productDetailReadiness()
    readiness['CONV-SAMPLE'] = true
    readiness['CONV-DOC'] = true
    readiness['MARKET-EU-001'] = true
    readiness['MARKET-UK-001'] = true
    readiness['GRADE-M510'] = true
    readiness['GRADE-M896'] = true
    const markup = await renderDetail(readiness)
    expect(markup).toContain('data-module="documents"')
    expect(markup).toContain('data-module="markets"')
    expect(markup).toContain('data-module="related-grades"')
    expect(markup).toContain('data-module="sample"')
    expect(markup).toContain('site_scope=tio2-my&amp;grade=M-350&amp;source_page=GRADE-M350')
    expect(markup).not.toContain('/contact')
  })
})
