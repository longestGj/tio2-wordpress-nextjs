import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json'

import type {MalaysiaResourceProcArticleMetadata} from '@/lib/resources/malaysia-resource-proc-article'
import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedContract = DeepReadonly<typeof approvedContract>
type PublicExternalSource = Omit<ApprovedContract['externalSources'][number], 'evidenceStatus'>
type PublicApplicationOverlap =
  | (ApprovedContract['applicationOverlap'] & {readonly evidenceAvailable: true})
  | Pick<ApprovedContract['applicationOverlap'], 'eyebrow' | 'heading'> & {
      readonly evidenceAvailable: false
    }

type PublicContractContent = Omit<
  ApprovedContract,
  | 'applicationOverlap'
  | 'articleMetadata'
  | 'externalSources'
  | 'internal'
  | 'releaseControls'
  | 'relations'
  | 'seo'
> & {
  readonly applicationOverlap: PublicApplicationOverlap
  readonly externalSources: readonly PublicExternalSource[]
  readonly seo: Omit<ApprovedContract['seo'], 'primaryKeyword'>
}

export interface MalaysiaResourceProcEligibleRelation {
  readonly relationKey: string
  readonly targetPageId: string
  readonly href: string
  readonly displayOrder: number
}

export type MalaysiaResourceProcPayload = PublicContractContent & {
  readonly articleMetadata: MalaysiaResourceProcArticleMetadata | null
  readonly eligibleRelations: readonly MalaysiaResourceProcEligibleRelation[]
  readonly schemaMode: 'BREADCRUMB_ONLY' | 'ARTICLE_WITH_BREADCRUMB'
}

export type MalaysiaResourceProcDto = Omit<
  MalaysiaResourceProcPayload,
  'identity' | 'globalChromeRef'
> & {
  readonly identity: MalaysiaResourceProcPayload['identity'] & {
    readonly id: string
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
}

export interface MalaysiaResourceProcSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly resourceProcPayload: unknown
}
