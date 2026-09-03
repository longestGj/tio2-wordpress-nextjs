import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'

export interface MalaysiaRequestSamplePageIdentity {
  readonly id: string
  readonly pageId: 'CONV-SAMPLE'
  readonly siteScope: 'tio2-my'
  readonly locale: 'en'
  readonly path: '/request-sample/'
  readonly schemaVersion: 'request-sample-v0.1-malaysia'
  readonly status: 'publish'
  readonly modified: string
}

export type MalaysiaRequestSamplePageDto = Omit<typeof contract, 'identity'> & {
  readonly identity: MalaysiaRequestSamplePageIdentity
  readonly globalChrome: Tio2MyGlobalChrome
}
