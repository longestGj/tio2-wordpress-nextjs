import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaM2196ProductDetailSource, m2196ProductDetailReadiness} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m2196.json'

vi.mock('next/image', () => ({default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props)}))

const prohibited = /M-996|TIOXHUA|R-2196|CHTi|vendor|Powder|Architectural|durability|opacity|Plastics|Masterbatch|Printing Inks|Paper|Specialty Materials|food contact|storage|safety|packaging offer|loading quantity|countryOfOrigin|comparison|Related grades|Not Recommended/iu

describe('M-2196 approved Product Detail candidate', () => {
  it('accepts the exact scoped Coatings and Sulfate projection', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM2196ProductDetailSource(), 'm-2196')
    expect(dto.identity).toMatchObject({pageId: 'GRADE-M2196', gradeCode: 'M-2196', path: '/products/m-2196', siteId: 'tio2-my', recordState: 'approved_for_preview'})
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items.map(({category}) => category)).toEqual(['Coatings', 'Coatings'])
    expect(dto.modules.applications.items.map(({title}) => title)).toEqual(['Solvent-Based Furniture Paint', 'Solvent-Based Industrial Paint'])
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Parameter', 'Value', 'Test method'])
    expect(dto.modules.technical.rows).toHaveLength(17)
    expect(dto.modules.technical.rows.every((row) => 'testMethod' in row)).toBe(true)
    const serialized = JSON.stringify(dto)
    expect(serialized.match(/Volatiles at 105°C, at packaging/gu)).toHaveLength(1)
    expect(serialized).not.toMatch(prohibited)
  })

  it('renders seventeen source values and methods with the CoA note', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={toMalaysiaProductDetailDto(malaysiaM2196ProductDetailSource(), 'm-2196')} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(18)
    expect(markup).toContain('data-label="Value">Sulfate</td>')
    expect(markup).toContain('data-label="Test method">ISO 591-1</td>')
    expect(markup).toContain(approved.technical.footnote)
    expect(markup.match(/Volatiles at 105°C, at packaging/gu)).toHaveLength(1)
    expect(markup).not.toMatch(prohibited)
    expect(markup).not.toContain('data-module="documents"')
  })

  it('uses only seventeen row.value claims in Product Schema and exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM2196ProductDetailSource(), 'm-2196')
    expect(buildMalaysiaProductDetailMetadata(getSiteConfig('tio2-my'), product, {VERCEL_ENV: 'preview'})).toMatchObject({
      title: approved.seo.title,
      description: approved.seo.description,
      alternates: {canonical: approved.seo.canonical},
      robots: {index: false, follow: false},
    })
    const nodes = buildMalaysiaProductDetailJsonLd(getSiteConfig('tio2-my'), product)['@graph'] as Array<Record<string, unknown>>
    const properties = nodes[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(nodes.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(properties.map(({value}) => value)).toEqual(approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(17)
    expect(properties.some(({value}) => value === 'ISO 591-1' || value === 'ISO 787-2' || value === '-')).toBe(false)
    expect(JSON.stringify(nodes)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|M-996|TIOXHUA|R-2196|CHTi/iu)
  })

  it('exposes only readiness-approved conditional routes with exact M-2196 prefills', () => {
    const readiness = m2196ProductDetailReadiness()
    for (const id of ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC', 'PRODUCT-PROC-SU', 'APP-COAT']) readiness[id] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM2196ProductDetailSource(readiness), 'm-2196')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-2196', source_page: 'GRADE-M2196'},
      {site_scope: 'tio2-my', grade: 'M-2196', source_page: 'GRADE-M2196'},
    ])
    expect(dto.modules.technical.action?.prefill).toEqual({site_scope: 'tio2-my', grade: 'M-2196', source_page: 'GRADE-M2196', requested_type: 'TDS'})
    expect(dto.modules.applications.items.every(({targetPageId}) => targetPageId === 'APP-COAT')).toBe(true)
    expect(dto.modules.positioning.contextualLink?.targetPageId).toBe('PRODUCT-PROC-SU')
  })

  it('fails closed for changed value, scope, slug or identity', () => {
    const changed = structuredClone(malaysiaM2196ProductDetailSource()) as unknown as Record<string, unknown>
    ;((changed.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows[0]!.value) = 'Chloride'
    expect(() => toMalaysiaProductDetailDto(changed as never, 'm-2196')).toThrow(ProductDetailContractError)
    const wrongScope = structuredClone(malaysiaM2196ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-2196')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM2196ProductDetailSource(), 'm-2377')).toThrow(ProductDetailContractError)
    const forged = structuredClone(malaysiaM2196ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-M2377'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'm-2196')).toThrow(ProductDetailContractError)
  })
})
