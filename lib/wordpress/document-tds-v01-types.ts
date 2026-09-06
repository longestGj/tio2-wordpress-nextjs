import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>} : T

export type MalaysiaDocumentTdsContract = DeepReadonly<typeof approvedContract>

export type MalaysiaDocumentTdsDto = MalaysiaDocumentTdsContract & {
  readonly cms: {
    readonly id: string
    readonly modified: string
    readonly status: 'publish'
  }
  readonly globalChrome: Tio2MyGlobalChrome
  readonly routeReadiness: Readonly<Record<'CONV-DOC' | 'DOC-000' | 'DOC-REACH' | 'DOC-COO', boolean>>
}
