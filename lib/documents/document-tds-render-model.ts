import type {Tio2MyGlobalChrome} from '@/lib/wordpress/tio2-my-global-chrome-types'
import type {MalaysiaDocumentTdsDto} from '@/lib/wordpress/document-tds-v01-types'

export interface DocumentTdsBreadcrumbItem {
  readonly label: string
  readonly route: string | null
}

export interface DocumentTdsHeroModule {
  readonly id: 'hero'
  readonly eyebrow: string
  readonly breadcrumb: readonly DocumentTdsBreadcrumbItem[]
  readonly h1: string
  readonly body: string
  readonly primary_action: string
  readonly secondary_action: string
}

export interface DocumentTdsTextModule {
  readonly id: string
  readonly heading: string
  readonly body: string
}

export interface DocumentTdsChoice {
  readonly id: string
  readonly heading: string
  readonly body: string
  readonly selection_label: string
  readonly selectable: boolean
}

export interface DocumentTdsChoiceModule {
  readonly id: 'document_choice'
  readonly heading: string
  readonly intro: string
  readonly choices: readonly DocumentTdsChoice[]
}

export interface DocumentTdsGradeModule {
  readonly id: 'product_grade'
  readonly heading: string
  readonly intro: string
  readonly selector_label: string
  readonly placeholder: string
  readonly helper: string
  readonly supplementary_note: string
  readonly initial_summary: string
}

export interface DocumentTdsComparisonModule {
  readonly id: 'comparison'
  readonly heading: string
  readonly intro: string
  readonly columns: readonly string[]
  readonly rows: readonly (readonly string[])[]
  readonly note: string
}

export interface DocumentTdsLabelItem {
  readonly label: string
  readonly body: string
}

export interface DocumentTdsChecklistModule {
  readonly id: 'request_checklist'
  readonly heading: string
  readonly intro: string
  readonly items: readonly DocumentTdsLabelItem[]
  readonly note: string
}

export interface DocumentTdsStep {
  readonly number: number
  readonly heading: string
  readonly body: string
}

export interface DocumentTdsProcessModule {
  readonly id: 'request_process'
  readonly heading: string
  readonly intro: string
  readonly steps: readonly DocumentTdsStep[]
  readonly microcopy: string
}

export interface DocumentTdsFaqModule {
  readonly id: 'buyer_questions'
  readonly heading: string
  readonly items: readonly {readonly question: string; readonly answer: string}[]
}

export interface DocumentTdsRelatedItem {
  readonly page_id: 'DOC-REACH' | 'DOC-COO' | 'DOC-000'
  readonly heading: string
  readonly body: string
  readonly link_label: string
  readonly route: string
}

export interface DocumentTdsRelatedModule {
  readonly id: 'related_paths'
  readonly heading: string
  readonly intro: string
  readonly items: readonly DocumentTdsRelatedItem[]
}

export interface DocumentTdsFinalModule {
  readonly id: 'final_cta'
  readonly heading: string
  readonly body: string
  readonly primary_action: string
  readonly secondary_action: string
}

export type DocumentTdsRenderModules = readonly [
  DocumentTdsHeroModule,
  DocumentTdsTextModule,
  DocumentTdsChoiceModule,
  DocumentTdsGradeModule,
  DocumentTdsComparisonModule,
  DocumentTdsChecklistModule,
  DocumentTdsProcessModule,
  DocumentTdsFaqModule,
  DocumentTdsRelatedModule,
  DocumentTdsFinalModule,
]

export interface DocumentTdsRenderModel {
  readonly globalChrome: Tio2MyGlobalChrome
  readonly request: {
    readonly documentHubRoute: string
    readonly primaryActionLabel: string
    readonly gradeOptions: readonly string[]
    readonly requestEnabled: boolean
    readonly documentHubEnabled: boolean
  }
  readonly modules: DocumentTdsRenderModules
}

export function toDocumentTdsRenderModel(page: MalaysiaDocumentTdsDto): DocumentTdsRenderModel {
  const [hero, directAnswer, choice, grade, comparison, checklist, process, faq, related, finalCta] = page.modules as unknown as DocumentTdsRenderModules

  return {
    globalChrome: page.globalChrome,
    request: {
      documentHubRoute: page.request_contract.secondary_route,
      primaryActionLabel: page.request_contract.primary_action_label,
      gradeOptions: [...page.request_contract.grade_options],
      requestEnabled: page.routeReadiness['CONV-DOC'],
      documentHubEnabled: page.routeReadiness['DOC-000'],
    },
    modules: [
      {
        id: hero.id,
        eyebrow: hero.eyebrow,
        breadcrumb: hero.breadcrumb.map(({label, route}) => ({label, route})),
        h1: hero.h1,
        body: hero.body,
        primary_action: hero.primary_action,
        secondary_action: hero.secondary_action,
      },
      {id: directAnswer.id, heading: directAnswer.heading, body: directAnswer.body},
      {
        id: choice.id,
        heading: choice.heading,
        intro: choice.intro,
        choices: choice.choices.map(({id, heading, body, selection_label, selectable}) => ({
          id, heading, body, selection_label, selectable,
        })),
      },
      {
        id: grade.id,
        heading: grade.heading,
        intro: grade.intro,
        selector_label: grade.selector_label,
        placeholder: grade.placeholder,
        helper: grade.helper,
        supplementary_note: grade.supplementary_note,
        initial_summary: grade.initial_summary,
      },
      {
        id: comparison.id,
        heading: comparison.heading,
        intro: comparison.intro,
        columns: [...comparison.columns],
        rows: comparison.rows.map((row) => [...row]),
        note: comparison.note,
      },
      {
        id: checklist.id,
        heading: checklist.heading,
        intro: checklist.intro,
        items: checklist.items.map(({label, body}) => ({label, body})),
        note: checklist.note,
      },
      {
        id: process.id,
        heading: process.heading,
        intro: process.intro,
        steps: process.steps.map(({number, heading, body}) => ({number, heading, body})),
        microcopy: process.microcopy,
      },
      {
        id: faq.id,
        heading: faq.heading,
        items: faq.items.map(({question, answer}) => ({question, answer})),
      },
      {
        id: related.id,
        heading: related.heading,
        intro: related.intro,
        items: related.items
          .filter((item) => page.routeReadiness[item.page_id])
          .map(({page_id, heading, body, link_label, route}) => ({page_id, heading, body, link_label, route})),
      },
      {
        id: finalCta.id,
        heading: finalCta.heading,
        body: finalCta.body,
        primary_action: finalCta.primary_action,
        secondary_action: finalCta.secondary_action,
      },
    ],
  }
}
