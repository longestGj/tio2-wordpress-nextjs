import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'

describe('MARKET-EU-001 approved projection', () => {
  it('locks the exact metadata, H1, five revised H2 values and semantic module order', () => {
    expect(contract.seo).toMatchObject({
      title: 'Malaysia Titanium Dioxide Supplier for EU Buyers | TiO2 Malaysia',
      metaDescription: 'Evaluate Malaysia-origin titanium dioxide grades for EU coatings, plastics, masterbatch, inks and paper. Request documents, samples or a quote.',
      canonical: 'https://tio2malaysia.com/markets/european-union/',
      hreflang: null,
    })
    expect(contract.hero.h1).toBe('Malaysia-Origin Titanium Dioxide for European Union Buyers')
    expect(contract.hero).not.toHaveProperty('pathLabel')
    expect(contract.hero).not.toHaveProperty('pathItems')
    expect(JSON.stringify(contract.hero)).not.toContain('Supplier to procurement path')
    expect([
      contract.procurement.h2,
      contract.grades.h2,
      contract.documents.h2,
      contract.destinations.h2,
      contract.conversion.h2,
    ]).toEqual([
      'Plan Your EU Titanium Dioxide Procurement Path',
      'Explore Titanium Dioxide Grades by Application',
      'Request Documents for Product and Supplier Qualification',
      'Explore Titanium Dioxide Supply by EU Destination',
      'Prepare Your EU Titanium Dioxide Supply Request',
    ])
    expect(contract.moduleOrder).toEqual([
      'breadcrumb', 'hero', 'supplier-definition', 'procurement-path', 'applications',
      'grades', 'documents', 'import-roles', 'origin', 'trade', 'destinations',
      'buyer-questions', 'conversion',
    ])
  })

  it('contains exactly six representative Grades in the approved 3+3 grouping', () => {
    expect(contract.grades.groups.map((group) => group.label)).toEqual(['Coatings', 'Plastics & Masterbatch'])
    expect(contract.grades.groups.map((group) => group.items.length)).toEqual([3, 3])
    expect(contract.grades.groups.flatMap((group) => group.items.map((item) => ({
      pageId: item.targetPageId, label: item.label, positioning: item.positioning, href: item.href,
    })))).toEqual([
      {pageId: 'GRADE-M350', label: 'M-350', positioning: 'Decorative, industrial and automotive coatings', href: '/products/m-350/'},
      {pageId: 'GRADE-M510', label: 'M-510', positioning: 'Architectural and automotive coatings', href: '/products/m-510/'},
      {pageId: 'GRADE-M896', label: 'M-896', positioning: 'Industrial and weather-resistant coatings', href: '/products/m-896/'},
      {pageId: 'GRADE-M200', label: 'M-200', positioning: 'Exterior plastics and durable plastic masterbatch', href: '/products/m-200/'},
      {pageId: 'GRADE-M108', label: 'M-108', positioning: 'Masterbatch, compounds, polyolefin and PVC film', href: '/products/m-108/'},
      {pageId: 'GRADE-M210', label: 'M-210', positioning: 'Polyolefin masterbatch and engineering plastics', href: '/products/m-210/'},
    ])
    expect(JSON.stringify(contract.grades)).not.toMatch(/M-996|M-2196|M-895|M-340|M-886|M-52|M-2377|CR-901/u)
  })

  it('preserves approved Application, destination, information and conversion relations', () => {
    expect(contract.applications.items.map((item) => item.targetPageId)).toEqual([
      'APP-COAT', 'APP-PLAS', 'APP-MB', 'APP-INK', 'APP-PAPER',
    ])
    expect(contract.destinations.items.map((item) => item.targetPageId)).toEqual([
      'MARKET-EU-DE', 'MARKET-EU-IT', 'MARKET-EU-ES',
      'MARKET-EU-PL', 'MARKET-EU-NL', 'MARKET-EU-BE',
    ])
    expect(contract.relations).toMatchObject({
      productsHub: {targetPageId: 'PRODUCT-000', href: '/products/'},
      applicationHub: {targetPageId: 'APP-000', href: '/applications/'},
      documentsHub: {targetPageId: 'DOC-000', href: '/documents/'},
      about: {targetPageId: 'ABOUT-001', href: '/about/'},
      resourcesHub: {targetPageId: 'RES-000', href: '/resources/'},
      tradeUpdate: {targetPageId: 'RES-TRADE-EU', href: '/resources/eu-titanium-dioxide-anti-dumping-duty/'},
      rfq: {targetPageId: 'CONV-RFQ', href: '/request-a-quote/?market=European%20Union&source_page=MARKET-EU-001'},
      requestDocuments: {targetPageId: 'CONV-DOC'},
      sample: {targetPageId: 'CONV-SAMPLE'},
    })
  })

  it('carries traceable dynamic sources and eight Buyer Clean answers without FAQ Schema authority', () => {
    expect(contract.importRoles.source).toMatchObject({
      url: 'https://echa.europa.eu/support/getting-started/enquiry-on-reach-and-clp',
      checkedDate: '2026-09-04', status: 'current', applicableScope: 'EU importer and only-representative responsibilities',
    })
    expect(contract.trade.evidence).toMatchObject({
      checkedDate: '2026-09-04', status: 'current', applicableScope: 'European Union titanium dioxide trade context',
    })
    expect(contract.trade.references).toHaveLength(3)
    expect(contract.buyerQuestions).toHaveLength(8)
    expect(JSON.stringify(contract)).not.toMatch(/"@type":"FAQPage"|QAPage/u)
  })

  it('keeps conditional official references keyboard-sized and the dark Origin primary action white', () => {
    const css = readFileSync('components/sites/tio2-my/markets/malaysia-eu-market-page.module.css', 'utf8')
    expect(css).toMatch(/\.tradeReferences a\s*\{[^}]*min-height:\s*44px/iu)
    expect(css).toMatch(/\.origin \.primaryButton\s*\{[^}]*background:\s*#fff[^}]*color:\s*#062b5b/iu)
  })
})
