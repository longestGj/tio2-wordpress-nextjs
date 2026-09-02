import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaM996ProductDetailSource, m996ProductDetailReadiness} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m996.json'

vi.mock('next/image', () => ({default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props)}))

const prohibited = /M-2196|TIOVAR|vendor|contact|gloss|Plastics|Masterbatch|Printing Inks|Paper|Specialty Materials|food contact|storage|packaging|safety|countryOfOrigin|comparison|Related grades|Not Recommended/iu

describe('M-996 approved Product Detail candidate', () => {
  it('accepts the exact scoped Coatings and Sulfate projection', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM996ProductDetailSource(), 'm-996')
    expect(dto.identity).toMatchObject({pageId: 'GRADE-M996', gradeCode: 'M-996', path: '/products/m-996', siteId: 'tio2-my', recordState: 'approved_for_preview'})
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items.map(({category}) => category)).toEqual(['Coatings', 'Coatings', 'Coatings'])
    expect(dto.modules.applications.items.map(({title}) => title)).toEqual(['Industrial Coatings', 'Powder Coatings', 'External and Internal Architectural Coatings'])
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Parameter', 'Value', 'Test method'])
    expect(dto.modules.technical.rows).toHaveLength(11)
    expect(dto.modules.technical.rows.every((row) => 'testMethod' in row)).toBe(true)
    expect(JSON.stringify(dto)).not.toMatch(prohibited)
  })

  it('renders eleven source values, methods and the 48-hour footnote', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={toMalaysiaProductDetailDto(malaysiaM996ProductDetailSource(), 'm-996')} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(12)
    expect(markup).toContain('data-label="Value">95%</td>')
    expect(markup).toContain('data-label="Test method">XRF</td>')
    expect(markup).toContain('*Moisture is measured within 48 hours of production.')
    expect(markup).not.toMatch(prohibited)
    expect(markup).not.toContain('data-module="documents"')
  })

  it('uses only eleven row.value claims in Product Schema and exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM996ProductDetailSource(), 'm-996')
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
    expect(properties).toHaveLength(11)
    expect(properties.some(({value}) => value === 'XRF' || value === 'ISO 787-2' || value === '-')).toBe(false)
    expect(JSON.stringify(nodes)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|M-2196/iu)
  })

  it('exposes only readiness-approved conditional routes with exact M-996 prefills', () => {
    const readiness = m996ProductDetailReadiness()
    for (const id of ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC', 'PRODUCT-PROC-SU', 'APP-COAT']) readiness[id] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM996ProductDetailSource(readiness), 'm-996')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-996', source_page: 'GRADE-M996'},
      {site_scope: 'tio2-my', grade: 'M-996', source_page: 'GRADE-M996'},
    ])
    expect(dto.modules.technical.action?.prefill).toEqual({site_scope: 'tio2-my', grade: 'M-996', source_page: 'GRADE-M996', requested_type: 'TDS'})
    expect(dto.modules.applications.items.every(({targetPageId}) => targetPageId === 'APP-COAT')).toBe(true)
    expect(dto.modules.positioning.contextualLink?.targetPageId).toBe('PRODUCT-PROC-SU')
  })

  it('fails closed for changed value, scope, slug or identity', () => {
    const changed = structuredClone(malaysiaM996ProductDetailSource()) as unknown as Record<string, unknown>
    ;((changed.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows[0]!.value) = '96%'
    expect(() => toMalaysiaProductDetailDto(changed as never, 'm-996')).toThrow(ProductDetailContractError)
    const wrongScope = structuredClone(malaysiaM996ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-996')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM996ProductDetailSource(), 'm-2196')).toThrow(ProductDetailContractError)
    const forged = structuredClone(malaysiaM996ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-M2196'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'm-996')).toThrow(ProductDetailContractError)
  })
})
