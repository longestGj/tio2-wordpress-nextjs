import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-page.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedAboutPageContract = DeepReadonly<typeof approvedContract>

export type MalaysiaAboutPageDto = Omit<ApprovedAboutPageContract, 'identity'> & {
  readonly identity: Omit<ApprovedAboutPageContract['identity'], 'siteScope' | 'path' | 'schemaVersion'> & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/about'
    readonly schemaVersion: 'about-page-v0.1-malaysia'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
}
