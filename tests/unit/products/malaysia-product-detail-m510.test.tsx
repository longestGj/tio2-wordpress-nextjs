import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {
  malaysiaM510ProductDetailSource,
  m510ProductDetailReadiness,
} from '@/tests/fixtures/tio2-my-product-detail'

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props),
}))

describe('M-510 approved Product Detail candidate', () => {
  it('accepts an exact distinct scoped projection with 12 two-column rows', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM510ProductDetailSource(), 'm-510')
    expect(dto.identity).toMatchObject({
      pageId: 'GRADE-M510', gradeCode: 'M-510', path: '/products/m-510', siteId: 'tio2-my',
    })
    expect(dto.seo.h1).toBe('M-510 Titanium Dioxide for Coating Evaluation')
    expect(dto.modules.technical.columns).toEqual(['Property', 'Typical value'])
    expect(dto.modules.technical.rows).toHaveLength(12)
    expect(dto.modules.technical.rows[0]).toEqual({property: 'TiO₂ content, %', typical: '94.5'})
    expect(dto.modules).not.toHaveProperty('relatedGrades')
  })

  it('renders through the shared template without blank Standard or Related Grades surfaces', async () => {
    const {MalaysiaProductDetail} = await import(
      '@/components/sites/tio2-my/products/malaysia-product-detail'
    )
    const product = toMalaysiaProductDetailDto(malaysiaM510ProductDetailSource(), 'm-510')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={product} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(product.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(13)
    expect(markup).not.toContain('data-label="Standard"')
    expect(markup).not.toContain('data-module="related-grades"')
    expect(markup).not.toContain('Related grades')
    expect(markup).toContain('data-source-page="GRADE-M510"')
  })

  it('emits exact M-510 metadata and a 12-property two-node graph', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM510ProductDetailSource(), 'm-510')
    const metadata = buildMalaysiaProductDetailMetadata(getSiteConfig('tio2-my'), product, {
      VERCEL_ENV: 'preview',
    })
    expect(metadata).toMatchObject({
      title: 'M-510 Titanium Dioxide for Coatings | TiO2 Malaysia',
      alternates: {canonical: 'https://tio2malaysia.com/products/m-510/'},
      robots: {index: false, follow: false},
    })
    const graph = buildMalaysiaProductDetailJsonLd(getSiteConfig('tio2-my'), product)
    const nodes = graph['@graph'] as Array<Record<string, unknown>>
    const properties = nodes[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(nodes.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(properties).toHaveLength(12)
    expect(properties[0]).toEqual({
      '@type': 'PropertyValue', name: 'TiO₂ content, %', value: '94.5',
    })
    expect(JSON.stringify(nodes[0])).not.toMatch(/Standard:|Offer|manufacturer|countryOfOrigin/iu)
  })

  it('passes only resolver-ready M-510 routes and exact prefills', () => {
    const readiness = m510ProductDetailReadiness()
    readiness['CONV-RFQ'] = true
    readiness['CONV-DOC'] = true
    readiness['PRODUCT-PROC-CL'] = true
    readiness['APP-COAT'] = true
    const dto = toMalaysiaProductDetailDto(
      malaysiaM510ProductDetailSource(readiness),
      'm-510',
    )
    expect(dto.modules.hero.actions[0]?.prefill).toEqual({
      site_scope: 'tio2-my', grade: 'M-510', source_page: 'GRADE-M510',
    })
    expect(dto.modules.positioning).toHaveProperty('contextualLink')
    expect(dto.modules.applications.items[0]).toHaveProperty('href')
    expect(dto.modules.applications.items[3]?.relatedTargets).toBeUndefined()
    expect(dto.modules.technical).toHaveProperty('action')
    expect(dto.modules.documents?.prefill).toEqual({
      site_scope: 'tio2-my', grade: 'M-510', source_page: 'GRADE-M510', requested_type: 'TDS',
    })
  })

  it('retains both independently ready split application targets', () => {
    const readiness = m510ProductDetailReadiness()
    readiness['APP-PLAS'] = true
    readiness['APP-MB'] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM510ProductDetailSource(readiness), 'm-510')
    expect(dto.modules.applications.items[3]?.relatedTargets).toEqual([
      {targetPageId: 'APP-PLAS', href: '/applications/titanium-dioxide-for-plastics/'},
      {targetPageId: 'APP-MB', href: '/applications/titanium-dioxide-for-masterbatch/'},
    ])
  })
})
