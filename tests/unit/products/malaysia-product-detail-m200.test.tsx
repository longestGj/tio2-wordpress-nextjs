import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaM200ProductDetailSource, m200ProductDetailReadiness} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m200.json'

vi.mock('next/image', () => ({default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props)}))

const prohibited = /CR-200|2024 V3|TIOVAR|storage conditions|packaging|container loading|loading quantity|shipment availability|Coatings|Printing Inks|Paper|Specialty Materials|origin claim|comparison|compliance claim|commerce claim/iu

describe('M-200 approved Product Detail candidate', () => {
  it('accepts exact scope, applications and two-column technical boundary', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM200ProductDetailSource(), 'm-200')
    expect(dto.identity).toMatchObject({pageId: 'GRADE-M200', gradeCode: 'M-200', path: '/products/m-200', siteId: 'tio2-my', recordState: 'approved_for_preview'})
    expect(dto.modules.hero.visual).toEqual(approved.hero.visual)
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items.map(({category}) => category)).toEqual(['Plastics', 'Plastics', 'Masterbatch'])
    expect(dto.modules.applications.items.map(({title}) => title)).toEqual([
      'uPVC Profiles, Plates and Exterior Furniture',
      'PVC Calendered Films, Including Advertising Film',
      'Durable Plastic Masterbatch',
    ])
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Property', 'Typical value'])
    expect(dto.modules.technical.rows).toHaveLength(12)
    expect(dto.modules.technical.rows.every((row) => !('testMethod' in row))).toBe(true)
    expect(JSON.stringify(dto)).not.toMatch(prohibited)
  })

  it('renders twelve rows and only the visible M-200 V1 2026 identity', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={toMalaysiaProductDetailDto(malaysiaM200ProductDetailSource(), 'm-200')} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(13)
    expect(markup).toContain('M-200 TDS · V1 2026')
    expect(markup).toContain('data-label="Typical value">92.5</td>')
    expect(markup).not.toContain('data-label="Test method"')
    expect(markup).not.toMatch(prohibited)
    expect(markup).not.toContain('data-module="documents"')
  })

  it('emits twelve visible values and exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM200ProductDetailSource(), 'm-200')
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
    expect(properties).toHaveLength(12)
    expect(JSON.stringify(nodes)).not.toMatch(/CR-200|2024 V3|TIOVAR|storage conditions|packaging|container loading|loading quantity|shipment availability|Coatings|Printing Inks|Paper|Specialty Materials|Offer|manufacturer|countryOfOrigin/iu)
  })

  it('preserves exact prefills and only approved route targets when ready', () => {
    const readiness = m200ProductDetailReadiness()
    for (const id of ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC', 'PRODUCT-PROC-CL', 'APP-MB', 'APP-PLAS']) readiness[id] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM200ProductDetailSource(readiness), 'm-200')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-200', source_page: 'GRADE-M200'},
      {site_scope: 'tio2-my', grade: 'M-200', source_page: 'GRADE-M200'},
    ])
    expect(dto.modules.technical.action?.prefill).toEqual({site_scope: 'tio2-my', grade: 'M-200', source_page: 'GRADE-M200', requested_type: 'TDS'})
    expect(dto.modules.applications.items.map(({targetPageId}) => targetPageId)).toEqual(['APP-PLAS', 'APP-PLAS', 'APP-MB'])
    expect(dto.modules.positioning.contextualLink?.targetPageId).toBe('PRODUCT-PROC-CL')
  })

  it('fails closed for changed value, scope, slug or identity', () => {
    const changed = structuredClone(malaysiaM200ProductDetailSource()) as unknown as Record<string, unknown>
    ;((changed.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows[0]!.value) = '95.0'
    expect(() => toMalaysiaProductDetailDto(changed as never, 'm-200')).toThrow(ProductDetailContractError)
    const wrongScope = structuredClone(malaysiaM200ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-200')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM200ProductDetailSource(), 'm-996')).toThrow(ProductDetailContractError)
    const forged = structuredClone(malaysiaM200ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-M996'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'm-200')).toThrow(ProductDetailContractError)
  })
})
