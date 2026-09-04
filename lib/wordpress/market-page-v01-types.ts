import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedEuMarketContract = DeepReadonly<typeof approvedContract>

type RuntimeReleaseControls = Omit<ApprovedEuMarketContract['releaseControls'],
  'tradeFreshness' | 'relatedRoutesReady' | 'conversionRuntimeReady' |
  'runtimeAcceptanceReady' | 'releaseEnabled' | 'indexingAuthorized' | 'sitemapAuthorized'> & {
  readonly tradeFreshness: string
  readonly relatedRoutesReady: boolean
  readonly conversionRuntimeReady: boolean
  readonly runtimeAcceptanceReady: boolean
  readonly releaseEnabled: boolean
  readonly indexingAuthorized: boolean
  readonly sitemapAuthorized: boolean
}

type RuntimeTrade = Omit<ApprovedEuMarketContract['trade'], 'evidence'> & {
  readonly evidence?: Omit<ApprovedEuMarketContract['trade']['evidence'], 'status' | 'checkedDate' | 'reviewedAt'> & {
    readonly status: 'current' | 'stale' | 'missing' | 'suppressed'
    readonly checkedDate: string
    readonly reviewedAt: string
  }
}

type RuntimeImportRoles = Omit<ApprovedEuMarketContract['importRoles'], 'source'> & {
  readonly source?: Omit<ApprovedEuMarketContract['importRoles']['source'], 'status' | 'checkedDate'> & {
    readonly status: 'current' | 'stale' | 'missing' | 'suppressed'
    readonly checkedDate: string
  }
}

export type MalaysiaEuMarketPageDto = Omit<
  ApprovedEuMarketContract,
  'identity' | 'releaseControls' | 'trade' | 'importRoles'
> & {
  readonly identity: ApprovedEuMarketContract['identity'] & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly releaseControls: RuntimeReleaseControls
  readonly trade: RuntimeTrade
  readonly importRoles: RuntimeImportRoles
  readonly globalChrome: Tio2MyGlobalChrome
}
