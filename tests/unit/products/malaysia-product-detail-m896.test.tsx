import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {
  ProductDetailContractError,
  toMalaysiaProductDetailDto,
} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {
  malaysiaM896ProductDetailSource,
  m896ProductDetailReadiness,
} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m896.json'

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props),
}))

describe('M-896 approved Product Detail candidate', () => {
  it('accepts the exact scoped projection and its value/testMethod technical shape', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM896ProductDetailSource(), 'm-896')
    expect(dto.identity).toMatchObject({
      pageId: 'GRADE-M896', gradeCode: 'M-896', path: '/products/m-896', siteId: 'tio2-my',
    })
    expect(dto.modules.hero.visual).toEqual(approved.hero.visual)
    expect(Object.keys(dto.modules.hero.visual)).toEqual(['label', 'technicalFile', 'currentData', 'note'])
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items).toHaveLength(6)
    expect(dto.modules.applications.items.every(({category}) => category === 'Coatings')).toBe(true)
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.technical.columns).toEqual(['Property', 'Value', 'Test method'])
    expect(dto.modules.technical.rows).toHaveLength(11)
    expect(dto.modules.technical.rows[0]).toEqual({property: 'TiO₂ content', value: '92%', testMethod: 'XRF'})
    expect(dto.modules).not.toHaveProperty('relatedGrades')
  })

  it('renders three semantic columns without origin, recommendations or related-grade surfaces', async () => {
    const {MalaysiaProductDetail} = await import(
      '@/components/sites/tio2-my/products/malaysia-product-detail'
    )
    const product = toMalaysiaProductDetailDto(malaysiaM896ProductDetailSource(), 'm-896')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={product} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(
      'M-896 Titanium Dioxide for Industrial Coating Evaluation',
    )
    expect(markup.match(/<tr/gu)).toHaveLength(12)
    expect(markup).toContain('data-label="Value">92%</td>')
    expect(markup).toContain('data-label="Test method">XRF</td>')
    expect(markup).not.toMatch(/origin|Not Recommended|Related grades/iu)
    expect(markup).not.toContain('data-module="related-grades"')
    expect(markup).toContain('data-source-page="GRADE-M896"')
  })

  it('uses row.value for Product Schema and emits exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM896ProductDetailSource(), 'm-896')
    const metadata = buildMalaysiaProductDetailMetadata(getSiteConfig('tio2-my'), product, {
      VERCEL_ENV: 'preview',
    })
    expect(metadata).toMatchObject({
      title: approved.seo.title,
      description: approved.seo.description,
      alternates: {canonical: approved.seo.canonical},
      robots: {index: false, follow: false},
    })
    const graph = buildMalaysiaProductDetailJsonLd(getSiteConfig('tio2-my'), product)
    const nodes = graph['@graph'] as Array<Record<string, unknown>>
    const properties = nodes[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(nodes.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(properties).toHaveLength(11)
    expect(properties.map(({value}) => value)).toEqual(approved.technical.rows.map(({value}) => value))
    expect(properties[0]).toMatchObject({name: 'TiO₂ content', value: '92%'})
    expect(properties[0]).not.toHaveProperty('description')
    expect(nodes[0]).not.toHaveProperty('image')
    expect(JSON.stringify(properties)).not.toContain('"value":"XRF"')
  })

  it('keeps exactly Quote and Sample as eligible Hero actions and preserves exact prefills', () => {
    const readiness = m896ProductDetailReadiness()
    readiness['CONV-RFQ'] = true
    readiness['CONV-SAMPLE'] = true
    readiness['CONV-DOC'] = true
    readiness['PRODUCT-PROC-CL'] = true
    readiness['APP-COAT'] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM896ProductDetailSource(readiness), 'm-896')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-896', source_page: 'GRADE-M896'},
      {site_scope: 'tio2-my', grade: 'M-896', source_page: 'GRADE-M896'},
    ])
    expect(dto.modules.hero.actions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({targetPageId: 'CONV-DOC'}),
    ]))
    expect(dto.modules.technical.action?.prefill).toEqual({
      site_scope: 'tio2-my', grade: 'M-896', source_page: 'GRADE-M896', requested_type: 'TDS',
    })
    expect(dto.modules.documents?.prefill).toEqual(dto.modules.technical.action?.prefill)
    expect(dto.modules.positioning.contextualLink?.targetPageId).toBe('PRODUCT-PROC-CL')
    expect(dto.modules.applications.items.every(({targetPageId}) => targetPageId === 'APP-COAT')).toBe(true)
  })

  it('fails closed for a missing value, a shifted method, wrong scope or wrong slug', () => {
    const missingValue = structuredClone(malaysiaM896ProductDetailSource()) as unknown as Record<string, unknown>
    const modules = (missingValue.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules
    delete modules.technical.rows[0]!.value
    expect(() => toMalaysiaProductDetailDto(missingValue as never, 'm-896')).toThrow(ProductDetailContractError)

    const shifted = structuredClone(malaysiaM896ProductDetailSource()) as unknown as Record<string, unknown>
    const shiftedRows = (shifted.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows
    shiftedRows[0]!.value = shiftedRows[0]!.testMethod
    expect(() => toMalaysiaProductDetailDto(shifted as never, 'm-896')).toThrow(ProductDetailContractError)

    const wrongScope = structuredClone(malaysiaM896ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-896')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM896ProductDetailSource(), 'm-510')).toThrow(ProductDetailContractError)
  })

  it('fails closed for forged M-896 Page ID, Grade, path or locale fields', () => {
    const mutations: Array<[string, (source: Record<string, unknown>) => void]> = [
      ['pageId', (source) => {
        const projection = source.publicProjection as {identity: Record<string, unknown>}
        projection.identity.pageId = 'GRADE-M510'
      }],
      ['gradeCode', (source) => {
        const projection = source.publicProjection as {identity: Record<string, unknown>}
        projection.identity.gradeCode = 'M-510'
      }],
      ['locale', (source) => {
        const projection = source.publicProjection as {identity: Record<string, unknown>}
        projection.identity.locale = 'ms'
      }],
      ['path', (source) => {
        source.publishingFields = {publicPath: '/products/m-510'}
      }],
    ]
    for (const [, mutate] of mutations) {
      const forged = structuredClone(malaysiaM896ProductDetailSource()) as unknown as Record<string, unknown>
      mutate(forged)
      expect(() => toMalaysiaProductDetailDto(forged as never, 'm-896')).toThrow(ProductDetailContractError)
    }
  })
})
