import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-documents-hub.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>} : T

type ApprovedDocumentsHubContract = DeepReadonly<typeof approvedContract>

export type MalaysiaDocumentsHubDto = Omit<ApprovedDocumentsHubContract, 'identity'> & {
  readonly identity: Omit<ApprovedDocumentsHubContract['identity'], 'siteScope' | 'path' | 'schemaVersion'> & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/documents'
    readonly schemaVersion: 'documents-hub-v0.1-malaysia'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
}
