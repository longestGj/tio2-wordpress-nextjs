import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {ProductDetailContractError, toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {cr901ProductDetailReadiness, malaysiaCr901ProductDetailSource} from '@/tests/fixtures/tio2-my-product-detail'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-cr901.json'

vi.mock('next/image', () => ({default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props)}))

const prohibited = /CR-200|M-200|Coatings|Plastics|Masterbatch|Printing Inks|Paper|cosmetics|medicine|non-toxic|safety|UV|anti-aging|batch-to-batch|storage|packaging|loading|countryOfOrigin|compliance|logistics|commerce/iu

describe('CR-901 approved Product Detail candidate', () => {
  it('accepts only the exact scoped specialty projection', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaCr901ProductDetailSource(), 'cr-901')
    expect(dto.identity).toMatchObject({pageId: 'GRADE-CR901', gradeCode: 'CR-901', path: '/products/cr-901', siteId: 'tio2-my', recordState: 'approved_for_preview'})
    expect(dto.modules.hero.actions).toEqual([])
    expect(dto.modules.applications.items.map(({category, title}) => ({category, title}))).toEqual([
      {category: 'Specialty Materials', title: 'Electronic Ceramics'},
      {category: 'Specialty Materials', title: 'Optical Glass'},
      {category: 'Specialty Materials', title: 'Battery Materials'},
      {category: 'Specialty Materials', title: 'Special Metallurgy'},
    ])
    expect(dto.modules.applications.items.every((item) => !item.href && !item.targetPageId)).toBe(true)
    expect(dto.modules.evaluation.groups).toHaveLength(2)
    expect(dto.modules.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(dto.modules.technical.columns).toEqual(['Specification', 'Typical Value'])
    expect(dto.modules.technical.rows).toHaveLength(9)
    expect(dto.modules.technical.rows.every((row) => !('testMethod' in row))).toBe(true)
    expect(JSON.stringify(dto)).not.toMatch(prohibited)
  })

  it('renders four unlinked specialty cards and nine exact two-column rows', async () => {
    const {MalaysiaProductDetail} = await import('@/components/sites/tio2-my/products/malaysia-product-detail')
    const markup = renderToStaticMarkup(<MalaysiaProductDetail product={toMalaysiaProductDetailDto(malaysiaCr901ProductDetailSource(), 'cr-901')} />)
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ')).toContain(approved.seo.h1)
    expect(markup.match(/<tr/gu)).toHaveLength(10)
    expect(markup.match(/data-label="Typical Value"/gu)).toHaveLength(9)
    expect(markup).not.toContain('data-label="Test method"')
    expect(markup).toContain(approved.technical.footnote)
    const applicationSection = markup.match(/data-module="applications"[\s\S]*?data-module="evaluation"/u)?.[0]
    expect(applicationSection).toBeDefined()
    expect(applicationSection).not.toContain('href=')
    expect(markup).not.toMatch(prohibited)
  })

  it('uses nine visible values in Product Schema and exact preview metadata', () => {
    const product = toMalaysiaProductDetailDto(malaysiaCr901ProductDetailSource(), 'cr-901')
    expect(buildMalaysiaProductDetailMetadata(getSiteConfig('tio2-my'), product, {VERCEL_ENV: 'preview'})).toMatchObject({
      title: approved.seo.title, description: approved.seo.description,
      alternates: {canonical: approved.seo.canonical}, robots: {index: false, follow: false},
    })
    const nodes = buildMalaysiaProductDetailJsonLd(getSiteConfig('tio2-my'), product)['@graph'] as Array<Record<string, unknown>>
    const properties = nodes[0]?.additionalProperty as Array<Record<string, unknown>>
    expect(nodes.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(properties.map(({value}) => value)).toEqual(approved.technical.rows.map(({value}) => value))
    expect(properties).toHaveLength(9)
    expect(JSON.stringify(nodes)).not.toMatch(prohibited)
  })

  it('preserves exact conditional prefills without inventing application or process routes', () => {
    const readiness = cr901ProductDetailReadiness(true)
    const dto = toMalaysiaProductDetailDto(malaysiaCr901ProductDetailSource(readiness), 'cr-901')
    expect(dto.modules.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(dto.modules.technical.action?.prefill).toEqual({site_scope: 'tio2-my', grade: 'CR-901', source_page: 'GRADE-CR901', requested_type: 'TDS'})
    expect(dto.modules.applications.items.every((item) => !item.href && !item.targetPageId)).toBe(true)
    expect(approved.routeRegistry.every(({href}) => !/^\/(?:applications|products\/(?:chloride|sulfate))/u.test(href))).toBe(true)
  })

  it('fails closed for changed value, scope, slug or identity', () => {
    const changed = structuredClone(malaysiaCr901ProductDetailSource()) as unknown as Record<string, unknown>
    ;(changed.publicProjection as {modules: {technical: {rows: Array<Record<string, unknown>>}}}).modules.technical.rows[0]!.value = '100'
    expect(() => toMalaysiaProductDetailDto(changed as never, 'cr-901')).toThrow(ProductDetailContractError)
    const wrongScope = structuredClone(malaysiaCr901ProductDetailSource()) as unknown as Record<string, unknown>
    wrongScope.siteScopes = {nodes: [{slug: 'tio2-a'}]}
    expect(() => toMalaysiaProductDetailDto(wrongScope as never, 'cr-901')).toThrow()
    expect(() => toMalaysiaProductDetailDto(malaysiaCr901ProductDetailSource(), 'not-approved')).toThrow(ProductDetailContractError)
    const forged = structuredClone(malaysiaCr901ProductDetailSource()) as unknown as Record<string, unknown>
    ;(forged.publicProjection as {identity: Record<string, unknown>}).identity.pageId = 'GRADE-M2377'
    expect(() => toMalaysiaProductDetailDto(forged as never, 'cr-901')).toThrow(ProductDetailContractError)
  })
})
