import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {
  malaysiaM895ProductDetailSource,
  m895ProductDetailReadiness,
} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m895.json'

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props),
}))

describe('M-895 approved Product Detail candidate', () => {
  it('accepts the exact scoped projection and contract-specific module counts', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM895ProductDetailSource(), 'm-895')
    expect(dto.identity).toMatchObject({
      pageId: 'GRADE-M895', gradeCode: 'M-895', path: '/products/m-895', siteId: 'tio2-my',
    })
    expect(dto.modules.hero.visual).toEqual(approved.hero.visual)
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items).toHaveLength(3)
    expect(dto.modules.applications.items.every(({category}) => category === 'Coatings')).toBe(true)
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Property', 'Typical value', 'Test method'])
    expect(dto.modules.technical.rows).toHaveLength(11)
    expect(dto.modules.technical.rows[0]).toEqual({property: 'TiO₂ content', value: '94%', testMethod: 'XRF'})
    expect(dto.modules).not.toHaveProperty('relatedGrades')
  })

  it('renders the exact H1, three semantic table columns and minimum fail-closed modules', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const product = toMalaysiaProductDetailDto(malaysiaM895ProductDetailSource(), 'm-895')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={product} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(12)
    expect(markup).toContain('data-label="Typical value">94%</td>')
    expect(markup).toContain('data-label="Test method">XRF</td>')
    expect(markup).not.toMatch(/origin|Not Recommended|Related grades/iu)
    expect(markup).not.toContain('data-module="documents"')
    expect(markup).toContain('data-source-page="GRADE-M895"')
  })

  it('uses row.value for Product Schema and emits exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM895ProductDetailSource(), 'm-895')
    expect(buildMalaysiaProductDetailMetadata(getSiteConfig('tio2-my'), product, {VERCEL_ENV: 'preview'})).toMatchObject({
      title: approved.seo.title,
      description: approved.seo.description,
      alternates: {canonical: approved.seo.canonical},
      robots: {index: false, follow: false},
    })
    const graph = buildMalaysiaProductDetailJsonLd(getSiteConfig('tio2-my'), product)
    const nodes = graph['@graph'] as Array<Record<string, unknown>>
    const properties = nodes[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(nodes.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(properties.map(({value}) => value)).toEqual(approved.technical.rows.map(({value}) => value))
    expect(properties.some(({value}) => value === 'XRF' || value === 'ISO 787-2')).toBe(false)
    expect(JSON.stringify(nodes)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo/iu)
  })

  it('exposes only readiness-approved conditional links with exact M-895 prefills', () => {
    const readiness = m895ProductDetailReadiness()
    for (const id of ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC', 'PRODUCT-PROC-CL', 'APP-COAT']) readiness[id] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM895ProductDetailSource(readiness), 'm-895')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-895', source_page: 'GRADE-M895'},
      {site_scope: 'tio2-my', grade: 'M-895', source_page: 'GRADE-M895'},
    ])
    expect(dto.modules.technical.action?.prefill).toEqual({
      site_scope: 'tio2-my', grade: 'M-895', source_page: 'GRADE-M895', requested_type: 'TDS',
    })
    expect(dto.modules.applications.items.every(({targetPageId}) => targetPageId === 'APP-COAT')).toBe(true)
  })

  it('fails closed for shifted technical semantics, wrong scope, slug or identity', () => {
    const shifted = structuredClone(malaysiaM895ProductDetailSource()) as unknown as Record<string, unknown>
    const rows = (shifted.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows
    rows[0]!.value = rows[0]!.testMethod
    expect(() => toMalaysiaProductDetailDto(shifted as never, 'm-895')).toThrow(ProductDetailContractError)

    const wrongScope = structuredClone(malaysiaM895ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-895')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM895ProductDetailSource(), 'm-896')).toThrow(ProductDetailContractError)

    const forged = structuredClone(malaysiaM895ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-M340'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'm-895')).toThrow(ProductDetailContractError)
  })
})
