import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaM886ProductDetailSource, m886ProductDetailReadiness} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m886.json'

vi.mock('next/image', () => ({default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props)}))

describe('M-886 approved Product Detail candidate', () => {
  it('accepts exact scope, counts and public relationship boundary', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM886ProductDetailSource(), 'm-886')
    expect(dto.identity).toMatchObject({pageId: 'GRADE-M886', gradeCode: 'M-886', path: '/products/m-886', siteId: 'tio2-my'})
    expect(dto.modules.hero.visual).toEqual(approved.hero.visual)
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items.map(({category}) => category)).toEqual(['Masterbatch', 'Plastics', 'Plastics'])
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Property', 'Typical value', 'Test method'])
    expect(dto.modules.technical.rows).toHaveLength(10)
    expect(dto.modules.technical.rows[3]).toEqual({property: 'Moisture when packed', value: '0.4% max', testMethod: 'ISO 787-2'})
    expect(JSON.stringify(dto)).not.toMatch(/Footwear|Coatings|11\/2024/iu)
  })

  it('renders exact visible data and minimum fail-closed modules', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const product = toMalaysiaProductDetailDto(malaysiaM886ProductDetailSource(), 'm-886')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={product} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(11)
    expect(markup).toContain('data-label="Typical value">0.4% max</td>')
    expect(markup).toContain('within 48 hours of production')
    expect(markup).not.toMatch(/Footwear|Coatings|11\/2024|Related grades/iu)
    expect(markup).not.toContain('data-module="documents"')
  })

  it('emits ten visible values and exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM886ProductDetailSource(), 'm-886')
    expect(buildMalaysiaProductDetailMetadata(getSiteConfig('tio2-my'), product, {VERCEL_ENV: 'preview'})).toMatchObject({
      title: approved.seo.title, description: approved.seo.description,
      alternates: {canonical: approved.seo.canonical}, robots: {index: false, follow: false},
    })
    const nodes = buildMalaysiaProductDetailJsonLd(getSiteConfig('tio2-my'), product)['@graph'] as Array<Record<string, unknown>>
    const properties = nodes[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(nodes.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(properties.map(({value}) => value)).toEqual(approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(10)
    expect(JSON.stringify(nodes)).not.toMatch(/Footwear|Coatings|11\/2024|Offer|manufacturer|countryOfOrigin/iu)
  })

  it('preserves exact prefills and only Plastics/Masterbatch targets when ready', () => {
    const readiness = m886ProductDetailReadiness()
    for (const id of ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC', 'PRODUCT-PROC-CL', 'APP-PLAS', 'APP-MB']) readiness[id] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM886ProductDetailSource(readiness), 'm-886')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-886', source_page: 'GRADE-M886'},
      {site_scope: 'tio2-my', grade: 'M-886', source_page: 'GRADE-M886'},
    ])
    expect(dto.modules.technical.action?.prefill).toEqual({site_scope: 'tio2-my', grade: 'M-886', source_page: 'GRADE-M886', requested_type: 'TDS'})
    expect(dto.modules.applications.items.map(({targetPageId}) => targetPageId)).toEqual(['APP-MB', 'APP-PLAS', 'APP-PLAS'])
  })

  it('fails closed for changed value, scope, slug or identity', () => {
    const changed = structuredClone(malaysiaM886ProductDetailSource()) as unknown as Record<string, unknown>
    ;((changed.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows[0]!.value) = '96%'
    expect(() => toMalaysiaProductDetailDto(changed as never, 'm-886')).toThrow(ProductDetailContractError)
    const wrongScope = structuredClone(malaysiaM886ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-886')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM886ProductDetailSource(), 'm-52')).toThrow(ProductDetailContractError)
    const forged = structuredClone(malaysiaM886ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-M52'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'm-886')).toThrow(ProductDetailContractError)
  })
})
