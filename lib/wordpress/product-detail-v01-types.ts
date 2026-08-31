import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json'

import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

type ApprovedContract = DeepReadonly<typeof approvedContract>
type Hero = Omit<ApprovedContract['hero'], 'actions'> & {
  readonly actions: readonly ApprovedContract['hero']['actions'][number][]
}
type Markets = Omit<ApprovedContract['markets'], 'items'> & {
  readonly items: readonly ApprovedContract['markets']['items'][number][]
}
type RelatedGrades = Omit<
  ApprovedContract['relatedGrades'],
  'items' | 'allTargetPageId' | 'allLabel' | 'allHref'
> & {
  readonly items: readonly ApprovedContract['relatedGrades']['items'][number][]
  readonly allTargetPageId?: string
  readonly allLabel?: string
  readonly allHref?: string
}

export interface MalaysiaProductDetailModules {
  readonly hero: Hero
  readonly positioning: ApprovedContract['positioning']
  readonly applications: ApprovedContract['applications']
  readonly evaluation: ApprovedContract['evaluation']
  readonly technical: ApprovedContract['technical']
  readonly documents?: ApprovedContract['documents']
  readonly markets?: Markets
  readonly relatedGrades?: RelatedGrades
  readonly sample?: ApprovedContract['sample']
}

export interface MalaysiaProductDetailDto {
  readonly reviewId: ApprovedContract['reviewId']
  readonly identity: Omit<ApprovedContract['identity'], 'path'> & {
    readonly id: string
    readonly siteId: 'tio2-my'
    readonly path: '/products/m-350'
    readonly status: 'publish'
    readonly modified: string
  }
  readonly releaseControls: ApprovedContract['releaseControls']
  readonly seo: ApprovedContract['seo']
  readonly globalChromeRef: ApprovedContract['globalChromeRef']
  readonly globalChrome: Tio2MyGlobalChrome
  readonly breadcrumb: ApprovedContract['breadcrumb']
  readonly modules: MalaysiaProductDetailModules
}

export type M350TechnicalRow = MalaysiaProductDetailDto['modules']['technical']['rows'][number]
