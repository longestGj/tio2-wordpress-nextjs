import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-hub.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedProductHubContract = DeepReadonly<typeof approvedContract>

export type MalaysiaProductHubDto = Omit<ApprovedProductHubContract, 'identity'> & {
  readonly identity: Omit<
    ApprovedProductHubContract['identity'],
    'siteScope' | 'path' | 'schemaVersion'
  > & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/products'
    readonly schemaVersion: 'product-hub-v0.1-malaysia'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
  readonly routeReadiness: Readonly<Record<string, boolean>>
}

export type MalaysiaProductGrade = MalaysiaProductHubDto['directory']['groups'][number]['grades'][number]
