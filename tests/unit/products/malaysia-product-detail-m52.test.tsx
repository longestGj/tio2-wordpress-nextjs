import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaM52ProductDetailSource, m52ProductDetailReadiness} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m52.json'

vi.mock('next/image', () => ({default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props)}))

describe('M-52 approved Product Detail candidate', () => {
  it('accepts exact scope, counts and public relationship boundary', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaM52ProductDetailSource(), 'm-52')
    expect(dto.identity).toMatchObject({pageId: 'GRADE-M52', gradeCode: 'M-52', path: '/products/m-52', siteId: 'tio2-my'})
    expect(dto.modules.hero.visual).toEqual(approved.hero.visual)
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items.map(({category}) => category)).toEqual(['Printing Inks', 'Coatings', 'Coatings'])
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Property', 'Typical value', 'Test method'])
    expect(dto.modules.technical.rows).toHaveLength(11)
    expect(dto.modules.technical.rows[3]).toEqual({property: 'Moisture when packed', value: '0.3% max', testMethod: 'ISO 787-2'})
    expect(JSON.stringify(dto)).not.toMatch(/Plastics|Masterbatch|Paper|Specialty/iu)
  })

  it('renders exact visible data and minimum fail-closed modules', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const product = toMalaysiaProductDetailDto(malaysiaM52ProductDetailSource(), 'm-52')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={product} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(12)
    expect(markup).toContain('data-label="Typical value">0.3% max</td>')
    expect(markup).toContain('within 48 hours of production')
    expect(markup).toContain('Sulfate process')
    expect(markup).not.toMatch(/Plastics|Masterbatch|Paper|Specialty|Related grades/iu)
    expect(markup).not.toContain('data-module="documents"')
  })

  it('emits eleven visible values and exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaM52ProductDetailSource(), 'm-52')
    expect(buildMalaysiaProductDetailMetadata(getSiteConfig('tio2-my'), product, {VERCEL_ENV: 'preview'})).toMatchObject({
      title: approved.seo.title, description: approved.seo.description,
      alternates: {canonical: approved.seo.canonical}, robots: {index: false, follow: false},
    })
    const nodes = buildMalaysiaProductDetailJsonLd(getSiteConfig('tio2-my'), product)['@graph'] as Array<Record<string, unknown>>
    const properties = nodes[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(nodes.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(properties.map(({value}) => value)).toEqual(approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(11)
    expect(JSON.stringify(nodes)).not.toMatch(/Plastics|Masterbatch|Paper|Specialty|Offer|manufacturer|countryOfOrigin/iu)
  })

  it('preserves exact prefills and only approved route targets when ready', () => {
    const readiness = m52ProductDetailReadiness()
    for (const id of ['CONV-RFQ', 'CONV-SAMPLE', 'CONV-DOC', 'PRODUCT-PROC-SU', 'APP-INK', 'APP-COAT']) readiness[id] = true
    const dto = toMalaysiaProductDetailDto(malaysiaM52ProductDetailSource(readiness), 'm-52')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.hero.actions.map(({prefill}) => prefill)).toEqual([
      {site_scope: 'tio2-my', grade: 'M-52', source_page: 'GRADE-M52'},
      {site_scope: 'tio2-my', grade: 'M-52', source_page: 'GRADE-M52'},
    ])
    expect(dto.modules.technical.action?.prefill).toEqual({site_scope: 'tio2-my', grade: 'M-52', source_page: 'GRADE-M52', requested_type: 'TDS'})
    expect(dto.modules.applications.items.map(({targetPageId}) => targetPageId)).toEqual(['APP-INK', 'APP-COAT', 'APP-COAT'])
    expect(dto.modules.positioning.contextualLink?.targetPageId).toBe('PRODUCT-PROC-SU')
  })

  it('fails closed for changed value, scope, slug or identity', () => {
    const changed = structuredClone(malaysiaM52ProductDetailSource()) as unknown as Record<string, unknown>
    ;((changed.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows[0]!.value) = '95%'
    expect(() => toMalaysiaProductDetailDto(changed as never, 'm-52')).toThrow(ProductDetailContractError)
    const wrongScope = structuredClone(malaysiaM52ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'm-52')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaM52ProductDetailSource(), 'm-108')).toThrow(ProductDetailContractError)
    const forged = structuredClone(malaysiaM52ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-M108'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'm-52')).toThrow(ProductDetailContractError)
  })
})
