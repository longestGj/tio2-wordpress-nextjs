import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json'

export interface MalaysiaRequestDocumentsPageIdentity {
  readonly id: string
  readonly pageId: 'CONV-DOC'
  readonly siteScope: 'tio2-my'
  readonly locale: 'en'
  readonly path: '/request-documents/'
  readonly schemaVersion: 'request-documents-v0.1-malaysia'
  readonly status: 'publish'
  readonly modified: string
}

export type MalaysiaRequestDocumentsPageDto = Omit<typeof contract, 'identity'> & {
  readonly identity: MalaysiaRequestDocumentsPageIdentity
  readonly globalChrome: Tio2MyGlobalChrome
}
