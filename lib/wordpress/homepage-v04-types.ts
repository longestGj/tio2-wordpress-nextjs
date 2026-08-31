import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'
import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedMalaysiaHomepageContract = DeepReadonly<typeof approvedContract>

export type MalaysiaHomepageDto = Omit<
  ApprovedMalaysiaHomepageContract,
  'globalChrome' | 'identity' | 'seo'
> & {
  readonly globalChrome: Tio2MyGlobalChrome
  readonly identity: Omit<
    ApprovedMalaysiaHomepageContract['identity'],
    'siteScope' | 'path' | 'schemaVersion'
  > & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/'
    readonly schemaVersion: 'homepage-v0.4-malaysia'
    readonly status: 'publish' | 'draft'
    readonly modified: string
  }
  readonly seo: ApprovedMalaysiaHomepageContract['seo'] & {
    readonly ogImage: null
    readonly primaryTopic: string
    readonly secondaryTopics: readonly string[]
  }
}
