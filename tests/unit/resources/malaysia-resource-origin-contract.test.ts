import {describe, expect, it} from 'vitest'

import * as resourceRegistry from '@/lib/wordpress/resource-page-registry'

const getContract = resourceRegistry.getApprovedMalaysiaResourceOriginContract

describe('RES-ORIGIN approved CMS contract', () => {
  it('locks identity, metadata and the thirteen-module page order', () => {
    expect(getContract).toBeTypeOf('function')
    const contract = getContract?.()

    expect(contract?.identity).toEqual({
      pageId: 'RES-ORIGIN',
      siteScope: 'tio2-my',
      locale: 'en',
      pageType: 'buying_guide',
      slug: 'non-china-titanium-dioxide',
      path: '/resources/non-china-titanium-dioxide/',
      canonical: 'https://tio2malaysia.com/resources/non-china-titanium-dioxide/',
    })
    expect(contract?.seo).toEqual({
      primaryKeyword: 'non china titanium dioxide',
      title: 'Non-China Titanium Dioxide Supply Guide | TiO2 Malaysia',
      description: 'Evaluate non-China titanium dioxide supply using checks for origin evidence, technical documents, application fit and destination-market requirements.',
      canonical: 'https://tio2malaysia.com/resources/non-china-titanium-dioxide/',
      language: 'en',
    })
    expect(contract?.moduleOrder).toEqual([
      'GLOBAL_HEADER', 'BREADCRUMB', 'HERO', 'DIRECT_ANSWER',
      'SIX_CHECKS', 'TECHNICAL_COMPARISON', 'APPLICATION_CONTEXT',
      'DOCUMENT_SCOPE', 'DESTINATION_REVIEW', 'QUALIFICATION_DECISION',
      'BUYER_QUESTIONS', 'FINAL_ACTION', 'GLOBAL_FOOTER',
    ])
  })

  it('locks every required collection count and ordered label', () => {
    expect(getContract).toBeTypeOf('function')
    const contract = getContract?.()

    expect(contract?.hero.qualificationPath).toEqual([
      'Confirm the commercial counterparty',
      'Confirm the product and grade identity',
      'Verify origin evidence and its scope',
      'Review current technical documents and methods',
      'Define application and processing conditions',
      'Check document, lot and destination requirements',
    ])
    expect(contract?.dueDiligence.checks.map((item) => item.heading)).toEqual(
      contract?.hero.qualificationPath,
    )
    expect(contract?.dueDiligence.checks).toHaveLength(6)
    expect(contract?.technicalComparison.steps).toHaveLength(5)
    expect(contract?.applicationContext.routes.map((item) => item.label)).toEqual([
      'Titanium Dioxide for Coatings',
      'Titanium Dioxide for Plastics',
      'Titanium Dioxide for Masterbatch',
      'Titanium Dioxide for Printing Inks',
      'Titanium Dioxide for Paper',
    ])
    expect(contract?.documentScope.checklist).toHaveLength(8)
    expect(contract?.destinationReview.destinations.map((item) => item.name)).toEqual([
      'European Union', 'United Kingdom', 'India', 'Brazil',
    ])
    expect(contract?.qualificationDecision.items.map((item) => item.heading)).toEqual([
      'Continue to product review',
      'Request missing evidence',
      'Hold the qualification decision',
    ])
    expect(contract?.buyerQuestions.items).toHaveLength(9)
  })

  it('keeps exact high-risk copy and omits prohibited claims', () => {
    expect(getContract).toBeTypeOf('function')
    const contract = getContract?.()

    expect(contract?.hero).toMatchObject({
      eyebrow: 'PROCUREMENT GUIDE',
      h1: 'Non-China Titanium Dioxide: A Procurement Evaluation Guide',
      supportingCopy: 'Use a practical framework to evaluate alternative-origin titanium dioxide through supplier and product identity, origin evidence, technical documentation, application conditions and destination-market requirements.',
    })
    expect(contract?.directAnswer.answer).toBe(
      'Non-China titanium dioxide is a procurement term used to describe titanium dioxide presented as originating outside China. For procurement teams, the label identifies a sourcing category for due diligence; it does not by itself verify origin, establish how a grade will perform, confirm availability or determine how authorities will treat a particular import. Those questions require separate evidence for the supplier, product, transaction, application and destination.',
    )
    expect(contract?.technicalComparison.callout).toBe(
      'A side-by-side table organizes evidence. It does not prove identical performance, equivalence or interchangeability.',
    )
    expect(contract?.qualificationDecision.note).toBe(
      'A hold is an evidence decision, not a statement that a material is technically unsuitable.',
    )

    const serialized = JSON.stringify(contract)
    expect(serialized).not.toMatch(/M-996|M-2196|TP-[A-Z0-9-]+/u)
    expect(contract?.articleMetadata).toBeNull()
    expect(contract?.releaseControls).toEqual({
      indexingAuthorized: false,
      sitemapAuthorized: false,
    })
  })
})
