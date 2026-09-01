import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-page.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedAboutPageContract = DeepReadonly<typeof approvedContract>

export type AboutEvidenceState = 'sufficient' | 'partial' | 'restricted'

export interface PublicHeroParagraph {
  readonly id: `hero.paragraph.${1 | 2 | 3 | 4 | 5 | 6}`
  readonly text: string
}

export interface PublicAboutFact {
  readonly label: string
  readonly value: string
  readonly href?: string
}

export type MalaysiaAboutPageDto = Omit<
  ApprovedAboutPageContract,
  'identity' | 'hero' | 'whoWeAre' | 'seo' | 'schema'
> & {
  readonly identity: Omit<ApprovedAboutPageContract['identity'], 'siteScope' | 'path' | 'schemaVersion'> & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/about'
    readonly schemaVersion: 'about-page-v0.1-malaysia'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly hero: Omit<ApprovedAboutPageContract['hero'], 'paragraphs'> & {
    readonly paragraphs: readonly PublicHeroParagraph[]
  }
  readonly whoWeAre: Omit<ApprovedAboutPageContract['whoWeAre'], 'facts'> & {
    readonly facts: readonly PublicAboutFact[]
  }
  readonly seo: Omit<ApprovedAboutPageContract['seo'], 'description'> & {
    readonly description: string | null
  }
  readonly schema: Omit<
    ApprovedAboutPageContract['schema'],
    'organizationDescription' | 'address' | 'areas'
  > & {
    readonly organizationDescription: string | null
    readonly address: ApprovedAboutPageContract['schema']['address'] | null
    readonly areas: readonly string[]
  }
  readonly evidence: {
    readonly state: AboutEvidenceState
    readonly contentVersion: string
  }
  readonly globalChrome: Tio2MyGlobalChrome
}
