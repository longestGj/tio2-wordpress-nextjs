import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedResourceHubContract = DeepReadonly<typeof approvedContract>

export interface MalaysiaResourceCard {
  readonly pageId: string
  readonly title: string
  readonly summary: string
  readonly href: string
  readonly resourceType: 'PROCUREMENT_GUIDE' | 'TECHNICAL_GUIDE' | 'TRADE_UPDATE'
  readonly ctaLabel: string
  readonly lastReviewedAt: string
  readonly contextLabel?: string
  readonly publishedAt?: string
  readonly trade?: Readonly<{
    officialSourceName: string
    officialSourceUrl: string
    applicableScope: string
    sourceDate: string
    reviewDate: string
    publicStatusLabel: string
  }>
}

export type MalaysiaResourcePublicState =
  | 'H0_NO_QUALIFIED_RESOURCE'
  | 'H2_ONE_PUBLIC_RESOURCE'
  | 'H3_MULTIPLE_PUBLIC_RESOURCES'
  | 'H4_TRADE_ITEM'

export type MalaysiaResourceHubDto = Omit<ApprovedResourceHubContract, 'identity' | 'resourceRelations'> & {
  readonly identity: Omit<ApprovedResourceHubContract['identity'], 'siteScope' | 'path' | 'schemaVersion'> & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/resources'
    readonly schemaVersion: 'resource-hub-v0.1-malaysia'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
  readonly publicState: MalaysiaResourcePublicState
  readonly featuredResources: readonly MalaysiaResourceCard[]
  readonly latestResources: readonly MalaysiaResourceCard[]
}
