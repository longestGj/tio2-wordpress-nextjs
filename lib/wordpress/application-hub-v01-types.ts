import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedApplicationHubContract = DeepReadonly<typeof approvedContract>

export type MalaysiaApplicationHubDto = Omit<ApprovedApplicationHubContract, 'identity'> & {
  readonly identity: Omit<ApprovedApplicationHubContract['identity'], 'siteScope' | 'path' | 'schemaVersion'> & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/applications'
    readonly schemaVersion: 'application-hub-v0.1-malaysia'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
  readonly routeReadiness: Readonly<Record<string, boolean>>
}

