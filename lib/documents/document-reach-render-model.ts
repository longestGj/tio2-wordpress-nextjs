import type {MalaysiaDocumentReachDto} from '@/lib/wordpress/document-reach-v01-types'
import type {Tio2MyGlobalChrome} from '@/lib/wordpress/tio2-my-global-chrome-types'

interface BreadcrumbItem {readonly label: string; readonly route: string | null}
interface HeadingBody {readonly heading: string; readonly body: string}
interface LabelBody {readonly label: string; readonly body: string}
interface HeroModule {
  readonly id: 'hero'; readonly eyebrow: string; readonly breadcrumb: readonly BreadcrumbItem[]
  readonly h1: string; readonly body: string; readonly scope_line: string; readonly orientation_heading: string
  readonly orientation: readonly LabelBody[]; readonly primary_action: string; readonly secondary_action: string
}
interface AnswerModule {readonly id: 'direct_answer'; readonly heading: string; readonly body: string}
interface SubstanceModule {readonly id: 'substance_vs_coverage'; readonly heading: string; readonly intro: string; readonly items: readonly HeadingBody[]}
interface ActorModule {readonly id: 'legal_actor'; readonly heading: string; readonly intro: string; readonly roles: readonly HeadingBody[]; readonly note: string}
interface ScopeModule {readonly id: 'regulatory_scope'; readonly heading: string; readonly jurisdictions: readonly HeadingBody[]; readonly note: string}
interface ChecklistModule {readonly id: 'verification_checklist'; readonly heading: string; readonly intro: string; readonly items: readonly LabelBody[]; readonly threshold_note: string}
interface SourceItem {
  readonly name: string; readonly scope: string; readonly source_updated_date: string | null
  readonly site_reviewed_date: string; readonly link_label: string; readonly url: string
}
interface SourcesModule {readonly id: 'official_sources'; readonly heading: string; readonly intro: string; readonly items: readonly SourceItem[]; readonly boundary: string}
interface Step {readonly number: number; readonly heading: string; readonly body: string}
interface ProcessModule {readonly id: 'request_process'; readonly heading: string; readonly steps: readonly Step[]; readonly request_selection: string; readonly request_note: string}
interface FaqModule {readonly id: 'buyer_questions'; readonly heading: string; readonly items: readonly {readonly question: string; readonly answer: string}[]}
interface RelatedItem {readonly page_id: 'MARKET-EU-001' | 'DOC-000'; readonly heading: string; readonly body: string; readonly link_label: string; readonly route: string}
interface RelatedModule {readonly id: 'related_paths'; readonly heading: string; readonly items: readonly RelatedItem[]}
interface FinalModule {readonly id: 'final_cta'; readonly heading: string; readonly body: string; readonly primary_action: string; readonly secondary_action: string; readonly note: string}

export type DocumentReachRenderModules = readonly [HeroModule, AnswerModule, SubstanceModule, ActorModule, ScopeModule, ChecklistModule, SourcesModule, ProcessModule, FaqModule, RelatedModule, FinalModule]
interface RelatedSourceItem extends RelatedItem {readonly render_when: string}
type DocumentReachSourceModules = readonly [HeroModule, AnswerModule, SubstanceModule, ActorModule, ScopeModule, ChecklistModule, SourcesModule, ProcessModule, FaqModule, Omit<RelatedModule, 'items'> & {readonly items: readonly RelatedSourceItem[]}, FinalModule]
interface RequestContract {
  readonly sample_public_destination: string; readonly primary_action_label: string
  readonly secondary_route: string; readonly secondary_action_label: string
  readonly document_type: {readonly page_semantic_label: string}
}

export interface DocumentReachRenderModel {
  readonly globalChrome: Tio2MyGlobalChrome
  readonly request: {
    readonly enabled: boolean; readonly href: string; readonly label: string; readonly semanticLabel: string
    readonly note: string; readonly hubEnabled: boolean; readonly hubRoute: string; readonly hubLabel: string
  }
  readonly modules: DocumentReachRenderModules
}

const clone = <T>(value: T): T => structuredClone(value)

export function toDocumentReachRenderModel(page: MalaysiaDocumentReachDto): DocumentReachRenderModel {
  const [hero, answer, substance, actor, scope, checklist, sources, process, faq, related, finalCta] = page.modules as unknown as DocumentReachSourceModules
  const request = page.request_contract as unknown as RequestContract
  return {
    globalChrome: page.globalChrome,
    request: {
      enabled: page.routeReadiness['CONV-DOC'], href: request.sample_public_destination,
      label: request.primary_action_label, semanticLabel: request.document_type.page_semantic_label,
      note: process.request_note, hubEnabled: page.routeReadiness['DOC-000'],
      hubRoute: request.secondary_route, hubLabel: request.secondary_action_label,
    },
    modules: [
      clone(hero), clone(answer), clone(substance), clone(actor), clone(scope), clone(checklist), clone(sources), clone(process), clone(faq),
      {id: related.id, heading: related.heading, items: related.items.filter((item) => page.routeReadiness[item.page_id]).map(({page_id, heading, body, link_label, route}) => ({page_id, heading, body, link_label, route}))},
      clone(finalCta),
    ],
  }
}
