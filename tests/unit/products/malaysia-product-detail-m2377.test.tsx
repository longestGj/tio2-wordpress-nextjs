import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaM2377ProductDetailSource, m2377ProductDetailReadiness} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m2377.json'

vi.mock('next/image', () => ({default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props)}))

const prohibited = /DOGUIDE|SR-2377|vendor|contact|Rubber|Specialty Materials|secondary PDF|packaging|countryOfOrigin|Offer|rating|origin support|compliance|logistics|commerce|Related grades|comparison|Not Recommended/iu

describe('M-2377 approved Product Detail candidate', () => {
  it('accepts only the exact scoped five-family and Sulfate projection', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM2377ProductDetailSource(), 'm-2377')
    expect(dto.identity).toMatchObject({pageId: 'GRADE-M2377', gradeCode: 'M-2377', path: '/products/m-2377', siteId: 'tio2-my', recordState: 'approved_for_preview'})
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items.map(({category}) => category)).toEqual(['Coatings', 'Plastics', 'Masterbatch', 'Printing Inks', 'Paper'])
    expect(dto.modules.applications.items.map(({title}) => title)).toEqual(['Coatings', 'Plastics', 'Masterbatch', 'Printing Inks', 'Paper'])
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Parameter', 'Value', 'Test method'])
    expect(dto.modules.technical.rows).toHaveLength(14)
    expect(dto.modules.technical.rows.every((row) => 'testMethod' in row)).toBe(true)
    const methods = dto.modules.technical.rows.map((row) => 'testMethod' in row ? row.testMethod : undefined)
    expect(methods.slice(0, 13)).toEqual(Array(13).fill('-'))
    expect(methods[13]).toBe('ISO 591-1:2000(E); ASTM D476-00')
    expect(JSON.stringify(dto)).not.toMatch(prohibited)
  })

  it('renders fourteen exact source rows and methods with the test-report note', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={toMalaysiaProductDetailDto(malaysiaM2377ProductDetailSource(), 'm-2377')} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(15)
    for (const row of approved.technical.rows) {
      expect(markup).toContain(row.value)
      expect(markup).toContain(`data-label="Test method">${row.testMethod}</td>`)
    }
    expect(markup).toContain(approved.technical.footnote)
    expect(markup).not.toMatch(prohibited)
    expect(markup).not.toContain('data-module="documents"')
  })

  it('uses only fourteen visible row.value claims in Product Schema and exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM2377ProductDetailSource(), 'm-2377')
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
    expect(properties).toHaveLength(14)
    expect(JSON.stringify(nodes)).not.toContain('ISO 591-1:2000(E); ASTM D476-00')
    expect(JSON.stringify(nodes)).not.toMatch(/Offer|manufacturer|countryOfOrigin|isSimilarTo|DOGUIDE|SR-2377|Rubber|Specialty Materials/iu)
  })

  it('exposes only readiness-approved conditional routes with exact M-2377 prefills', () => {
    const readiness = m2377ProductDetailReadiness()
    for (const id of ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC', 'PRODUCT-PROC-SU', 'APP-COAT', 'APP-PLAS', 'APP-MB', 'APP-INK', 'APP-PAPER']) readiness[id] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM2377ProductDetailSource(readiness), 'm-2377')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-2377', source_page: 'GRADE-M2377'},
      {site_scope: 'tio2-my', grade: 'M-2377', source_page: 'GRADE-M2377'},
    ])
    expect(dto.modules.technical.action?.prefill).toEqual({site_scope: 'tio2-my', grade: 'M-2377', source_page: 'GRADE-M2377', requested_type: 'TDS'})
    expect(dto.modules.applications.items.map(({targetPageId}) => targetPageId)).toEqual(['APP-COAT', 'APP-PLAS', 'APP-MB', 'APP-INK', 'APP-PAPER'])
    expect(dto.modules.positioning.contextualLink?.targetPageId).toBe('PRODUCT-PROC-SU')
  })

  it('fails closed for changed value, scope, slug or identity', () => {
    const changed = structuredClone(malaysiaM2377ProductDetailSource()) as unknown as Record<string, unknown>
    ;((changed.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows[0]!.value) = '94%'
    expect(() => toMalaysiaProductDetailDto(changed as never, 'm-2377')).toThrow(ProductDetailContractError)
    const wrongScope = structuredClone(malaysiaM2377ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-2377')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM2377ProductDetailSource(), 'cr-901')).toThrow(ProductDetailContractError)
    const forged = structuredClone(malaysiaM2377ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-CR901'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'm-2377')).toThrow(ProductDetailContractError)
  })
})
