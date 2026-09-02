import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaM108ProductDetailSource, m108ProductDetailReadiness} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m108.json'

vi.mock('next/image', () => ({default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props)}))

const prohibited = /2023V3|V3 2023|Coatings|Printing Inks|Paper|Specialty Materials/iu

describe('M-108 approved Product Detail candidate', () => {
  it('accepts exact scope, counts and public relationship boundary', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM108ProductDetailSource(), 'm-108')
    expect(dto.identity).toMatchObject({pageId: 'GRADE-M108', gradeCode: 'M-108', path: '/products/m-108', siteId: 'tio2-my'})
    expect(dto.modules.hero.visual).toEqual(approved.hero.visual)
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items.map(({category}) => category)).toEqual(['Masterbatch', 'Plastics', 'Plastics'])
    expect(dto.modules.applications.items.map(({title}) => title)).toEqual([
      'Masterbatch and Compounds', 'Polyolefin and PVC Film', 'Plastics Requiring High Thermal Stability',
    ])
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Property', 'Typical value', 'Test method'])
    expect(dto.modules.technical.rows).toHaveLength(10)
    expect(dto.modules.technical.rows[3]).toEqual({property: 'Moisture when packed', value: '0.4% max', testMethod: 'ISO 787-2'})
    expect(JSON.stringify(dto)).not.toMatch(prohibited)
  })

  it('renders exact visible data and minimum fail-closed modules', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const product = toMalaysiaProductDetailDto(malaysiaM108ProductDetailSource(), 'm-108')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={product} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(11)
    expect(markup).toContain('data-label="Typical value">0.4% max</td>')
    expect(markup).toContain('within 48 hours of production')
    expect(markup).toContain('Sulfate process')
    expect(markup).not.toMatch(prohibited)
    expect(markup).not.toContain('data-module="documents"')
  })

  it('emits ten visible values and exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM108ProductDetailSource(), 'm-108')
    expect(buildMalaysiaProductDetailMetadata(getSiteConfig('tio2-my'), product, {VERCEL_ENV: 'preview'})).toMatchObject({
      title: approved.seo.title, description: approved.seo.description,
      alternates: {canonical: approved.seo.canonical}, robots: {index: false, follow: false},
    })
    const nodes = buildMalaysiaProductDetailJsonLd(getSiteConfig('tio2-my'), product)['@graph'] as Array<Record<string, unknown>>
    const properties = nodes[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(nodes.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(properties.map(({value}) => value)).toEqual(approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(10)
    expect(JSON.stringify(nodes)).not.toMatch(/2023V3|V3 2023|Coatings|Printing Inks|Paper|Specialty Materials|Offer|manufacturer|countryOfOrigin/iu)
  })

  it('preserves exact prefills and only approved route targets when ready', () => {
    const readiness = m108ProductDetailReadiness()
    for (const id of ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC', 'PRODUCT-PROC-SU', 'APP-MB', 'APP-PLAS']) readiness[id] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM108ProductDetailSource(readiness), 'm-108')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-108', source_page: 'GRADE-M108'},
      {site_scope: 'tio2-my', grade: 'M-108', source_page: 'GRADE-M108'},
    ])
    expect(dto.modules.technical.action?.prefill).toEqual({site_scope: 'tio2-my', grade: 'M-108', source_page: 'GRADE-M108', requested_type: 'TDS'})
    expect(dto.modules.applications.items.map(({targetPageId}) => targetPageId)).toEqual(['APP-MB', 'APP-PLAS', 'APP-PLAS'])
    expect(dto.modules.positioning.contextualLink?.targetPageId).toBe('PRODUCT-PROC-SU')
  })

  it('fails closed for changed value, scope, slug or identity', () => {
    const changed = structuredClone(malaysiaM108ProductDetailSource()) as unknown as Record<string, unknown>
    ;((changed.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows[0]!.value) = '97%'
    expect(() => toMalaysiaProductDetailDto(changed as never, 'm-108')).toThrow(ProductDetailContractError)
    const wrongScope = structuredClone(malaysiaM108ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-108')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM108ProductDetailSource(), 'm-210')).toThrow(ProductDetailContractError)
    const forged = structuredClone(malaysiaM108ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-M210'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'm-108')).toThrow(ProductDetailContractError)
  })
})
