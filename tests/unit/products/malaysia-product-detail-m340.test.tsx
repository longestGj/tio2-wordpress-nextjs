import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {
  malaysiaM340ProductDetailSource,
  m340ProductDetailReadiness,
} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m340.json'

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props),
}))

describe('M-340 approved Product Detail candidate', () => {
  it('accepts the exact scoped projection and five approved application directions', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM340ProductDetailSource(), 'm-340')
    expect(dto.identity).toMatchObject({
      pageId: 'GRADE-M340', gradeCode: 'M-340', path: '/products/m-340', siteId: 'tio2-my',
    })
    expect(dto.modules.hero.visual).toEqual(approved.hero.visual)
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items.map(({category}) => category)).toEqual([
      'Masterbatch', 'Plastics', 'Plastics', 'Plastics', 'Plastics',
    ])
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Technical index', 'Standard', 'Typical value'])
    expect(dto.modules.technical.rows).toHaveLength(14)
    expect(dto.modules.technical.rows[12]).toEqual({property: 'Inorganic treatment', standard: 'Al₂O₃', typical: '--'})
    expect(dto.modules.technical.rows[13]).toEqual({property: 'Organic treatment', standard: 'Yes', typical: '--'})
    expect(JSON.stringify(dto)).not.toMatch(/Rubber/iu)
  })

  it('renders all fourteen source-faithful rows while omitting unavailable modules', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const product = toMalaysiaProductDetailDto(malaysiaM340ProductDetailSource(), 'm-340')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={product} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(15)
    expect(markup).toContain('data-label="Standard">Al₂O₃</td>')
    expect(markup).toContain('data-label="Typical value">--</td>')
    expect(markup).not.toMatch(/Rubber|origin|Not Recommended|Related grades/iu)
    expect(markup).not.toContain('data-module="documents"')
    expect(markup).toContain('data-source-page="GRADE-M340"')
  })

  it('emits exact metadata and fourteen meaningful Product properties', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM340ProductDetailSource(), 'm-340')
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
    expect(properties).toHaveLength(14)
    expect(properties.slice(0, 12).map(({value}) => value)).toEqual(approved.technical.rows.slice(0, 12).map(({typical}) => typical))
    expect(properties[12]).toMatchObject({name: 'Inorganic treatment', value: 'Al₂O₃'})
    expect(properties[13]).toMatchObject({name: 'Organic treatment', value: 'Yes'})
    expect(properties.some(({value}) => value === '--')).toBe(false)
    expect(JSON.stringify(nodes)).not.toMatch(/Rubber|Offer|manufacturer|countryOfOrigin|isSimilarTo/iu)
  })

  it('exposes only readiness-approved links with exact M-340 prefills and no Rubber target', () => {
    const readiness = m340ProductDetailReadiness()
    for (const id of ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC', 'PRODUCT-PROC-CL', 'APP-PLAS', 'APP-MB']) readiness[id] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM340ProductDetailSource(readiness), 'm-340')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-340', source_page: 'GRADE-M340'},
      {site_scope: 'tio2-my', grade: 'M-340', source_page: 'GRADE-M340'},
    ])
    expect(dto.modules.technical.action?.prefill).toEqual({
      site_scope: 'tio2-my', grade: 'M-340', source_page: 'GRADE-M340', requested_type: 'TDS',
    })
    expect(dto.modules.applications.items.map(({targetPageId}) => targetPageId)).toEqual([
      'APP-MB', 'APP-PLAS', 'APP-PLAS', 'APP-PLAS', 'APP-PLAS',
    ])
    expect(JSON.stringify(dto.modules)).not.toMatch(/Rubber/iu)
  })

  it('fails closed for a changed visible row, wrong scope, slug or identity', () => {
    const changed = structuredClone(malaysiaM340ProductDetailSource()) as unknown as Record<string, unknown>
    const rows = (changed.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows
    rows[12]!.standard = 'Unknown'
    expect(() => toMalaysiaProductDetailDto(changed as never, 'm-340')).toThrow(ProductDetailContractError)

    const wrongScope = structuredClone(malaysiaM340ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-340')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM340ProductDetailSource(), 'm-886')).toThrow(ProductDetailContractError)

    const forged = structuredClone(malaysiaM340ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-M886'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'm-340')).toThrow(ProductDetailContractError)
  })
})
