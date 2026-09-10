import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-contact-page.json'
import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>} : T

type Approved = DeepReadonly<typeof contract>
type FactKey = 'generalInquiries' | 'operatingCompany' | 'manufacturingSite'

export type MalaysiaContactPageDto = Omit<Approved, 'identity' | 'contactDetails'> & {
  readonly identity: {
    readonly id: string
    readonly pageId: 'CONTACT-001'
    readonly siteId: 'tio2-my'
    readonly locale: 'en'
    readonly path: '/contact'
    readonly contractVersion: 'contact-page-v0.1-malaysia'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly contactDetails: Omit<Approved['contactDetails'], FactKey> &
    Readonly<Record<FactKey, Approved['contactDetails'][FactKey] | null>>
  readonly globalChrome: Tio2MyGlobalChrome
}
