import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'

export interface MalaysiaRfqPageIdentity {
  readonly id: string
  readonly pageId: 'CONV-RFQ'
  readonly siteScope: 'tio2-my'
  readonly locale: 'en'
  readonly path: '/request-a-quote/'
  readonly schemaVersion: 'rfq-page-v0.1-malaysia'
  readonly status: 'publish'
  readonly modified: string
}

export type MalaysiaRfqPageDto = Omit<typeof contract, 'identity'> & {
  readonly identity: MalaysiaRfqPageIdentity
  readonly globalChrome: Tio2MyGlobalChrome
}
