import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedContract = DeepReadonly<typeof approvedContract>
type PublicContractContent = Omit<
  ApprovedContract,
  'internal' | 'releaseControls' | 'relations' | 'seo'
> & {
  readonly seo: Omit<ApprovedContract['seo'], 'primaryKeyword'>
}

export interface MalaysiaResourceOriginEligibleRelation {
  readonly relationKey: string
  readonly targetPageId: string
  readonly href: string
  readonly displayOrder: number
}

export type MalaysiaResourceOriginPayload = PublicContractContent & {
  readonly eligibleRelations: readonly MalaysiaResourceOriginEligibleRelation[]
  readonly schemaMode: 'BREADCRUMB_ONLY' | 'ARTICLE_WITH_BREADCRUMB'
}

export type MalaysiaResourceOriginDto = Omit<
  MalaysiaResourceOriginPayload,
  'identity' | 'globalChromeRef'
> & {
  readonly identity: MalaysiaResourceOriginPayload['identity'] & {
    readonly id: string
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
}

export interface MalaysiaResourceOriginSource {
  readonly id: unknown
  readonly modifiedGmt: unknown
  readonly status: unknown
  readonly siteScopes: unknown
  readonly publishingFields: unknown
  readonly resourceOriginPayload: unknown
}
