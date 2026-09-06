import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedMarketHubContract = DeepReadonly<typeof approvedContract>

export type MalaysiaMarketHubDto = Omit<ApprovedMarketHubContract, 'identity'> & {
  readonly identity: Omit<
    ApprovedMarketHubContract['identity'],
    'siteScope' | 'path' | 'schemaVersion'
  > & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/markets'
    readonly schemaVersion: 'market-hub-v0.1-malaysia'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
}
