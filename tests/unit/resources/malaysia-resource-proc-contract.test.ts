import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const contractPath = resolve(
  'wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json',
)

function loadContract(): Record<string, any> | null {
  if (!existsSync(contractPath)) return null
  return JSON.parse(readFileSync(contractPath, 'utf8')) as Record<string, any>
}

describe('RES-PROC approved content contract', () => {
  it('binds the exact Malaysia identity and locked SEO values', () => {
    const contract = loadContract()
    expect(contract, 'missing scoped RES-PROC CMS contract').not.toBeNull()
    expect(contract?.identity).toEqual({
      pageId: 'RES-PROC',
      siteScope: 'tio2-my',
      locale: 'en',
      pageType: 'buying_guide',
      slug: 'chloride-vs-sulfate-titanium-dioxide',
      path: '/resources/chloride-vs-sulfate-titanium-dioxide/',
      canonical:
        'https://tio2malaysia.com/resources/chloride-vs-sulfate-titanium-dioxide/',
    })
    expect(contract?.seo).toEqual({
      primaryKeyword: 'chloride vs sulfate titanium dioxide',
      title: 'Chloride vs Sulfate Titanium Dioxide | Buyer Guide',
      description:
        'Compare chloride and sulfate titanium dioxide routes, learn what route labels can indicate, and identify the grade-level evidence buyers still need to check.',
      canonical:
        'https://tio2malaysia.com/resources/chloride-vs-sulfate-titanium-dioxide/',
      language: 'en',
    })
  })

  it('preserves the exact fourteen-module order', () => {
    const contract = loadContract()
    expect(contract?.moduleOrder).toEqual([
      'GLOBAL_HEADER',
      'BREADCRUMB',
      'HERO',
      'DIRECT_ANSWER',
      'ON_THIS_PAGE',
      'ROUTE_DIFFERENCE',
      'LABEL_LIMIT',
      'GRADE_EVIDENCE',
      'APPLICATION_OVERLAP',
      'QUALIFICATION_WORKFLOW',
      'BUYER_QUESTIONS',
      'SOURCES',
      'FINAL_ACTION',
      'GLOBAL_FOOTER',
    ])
  })

  it('keeps the approved content cardinalities and atomic Process action pair', () => {
    const contract = loadContract()
    expect({
      routes: contract?.routeDifference?.routeCards?.length,
      canIndicate: contract?.labelLimit?.canIndicate?.length,
      cannotEstablish: contract?.labelLimit?.cannotEstablish?.length,
      gradeRows: contract?.gradeEvidence?.rows?.length,
      overlapStatements: contract?.applicationOverlap?.evidenceItems?.length,
      workflowSteps: contract?.qualificationWorkflow?.steps?.length,
      outcomes: contract?.qualificationWorkflow?.outcomes?.length,
      buyerQuestions: contract?.buyerQuestions?.items?.length,
      sourceGroups: contract?.sources?.groups?.length,
      sourceLinks: contract?.externalSources?.length,
      processActions: contract?.finalAction?.processActions?.length,
    }).toEqual({
      routes: 2,
      canIndicate: 4,
      cannotEstablish: 6,
      gradeRows: 6,
      overlapStatements: 3,
      workflowSteps: 5,
      outcomes: 3,
      buyerQuestions: 4,
      sourceGroups: 6,
      sourceLinks: 7,
      processActions: 2,
    })
    expect(contract?.finalAction?.processActions?.map(
      ({relationKey}: {relationKey: string}) => relationKey,
    )).toEqual(['chloride_process', 'sulfate_process'])
  })

  it('preserves the approved thesis and avoids a route winner or Grade recommendation', () => {
    const contract = loadContract()
    expect(contract?.hero?.h1).toBe(
      'Chloride vs Sulfate Titanium Dioxide: A Buyer’s Evaluation Guide',
    )
    expect(contract?.directAnswer?.answer).toBe(
      'Chloride and sulfate identify two different production routes for titanium dioxide pigment. The production route can influence how the base pigment is formed, but the route label alone is insufficient to establish a grade-level performance conclusion. Opacity, hiding power, undertone, weatherability, dispersion and formulation suitability should be evaluated using current grade-specific evidence and, where relevant, application-specific testing under the buyer’s intended conditions.',
    )
    expect(contract?.gradeEvidence?.tableNote).toBe(
      'This framework organizes the questions a buyer should resolve. It is not a product specification, a process scorecard or a grade recommendation.',
    )
    expect(JSON.stringify(contract)).not.toMatch(/"winner"|"recommendedGrade"|"equivalentGrade"/u)
  })

  it('keeps seven source links in their approved statement families', () => {
    const contract = loadContract()
    expect(contract?.externalSources?.map((source: Record<string, unknown>) => ({
      sourceKey: source.sourceKey,
      statementFamily: source.statementFamily,
      evidenceStatus: source.evidenceStatus,
    }))).toEqual([
      {sourceKey: 'epa_process', statementFamily: 'official_process_orientation', evidenceStatus: 'APPROVED'},
      {sourceKey: 'jrc_bref', statementFamily: 'official_route_scope', evidenceStatus: 'APPROVED'},
      {sourceKey: 'jrc_preliminary', statementFamily: 'draft_process_mechanics', evidenceStatus: 'APPROVED'},
      {sourceKey: 'eurlex_rutile', statementFamily: 'rutile_process_scope', evidenceStatus: 'APPROVED'},
      {sourceKey: 'tronox_portfolio', statementFamily: 'producer_portfolio_context', evidenceStatus: 'APPROVED'},
      {sourceKey: 'lb_blr886', statementFamily: 'named_grade_chloride_plastics', evidenceStatus: 'APPROVED'},
      {sourceKey: 'lb_lr108', statementFamily: 'named_grade_sulfate_plastics', evidenceStatus: 'APPROVED'},
    ])
  })

  it('keeps release controls, Article and source review state fail-closed', () => {
    const contract = loadContract()
    expect(contract?.releaseControls).toEqual({
      indexingAuthorized: false,
      sitemapAuthorized: false,
    })
    expect(contract?.articleMetadata).toBeNull()
    expect(contract?.sources?.visibleReviewDate).toBe('2026-09-05')
  })
})
