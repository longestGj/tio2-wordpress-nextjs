import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

export interface ChlorideProcessActionContext {
  readonly sourcePageId: 'PRODUCT-PROC-CL'
}

export interface ChlorideProcessAction {
  readonly label: string
  readonly href: string
  readonly targetPageId: string
  readonly context?: ChlorideProcessActionContext
}

export interface ChlorideProcessGradeRelation {
  readonly registeredPageId: 'GRADE-M350' | 'GRADE-M510' | 'GRADE-M896' | 'GRADE-M895' | 'GRADE-M200' | 'GRADE-M210' | 'GRADE-M340' | 'GRADE-M886'
  readonly gradeNameOrModelCode: string
  readonly position: number
  readonly cleanUrl: string
  readonly summary: string
  readonly actionLabel: string
}

export interface ChlorideProcessStep {
  readonly heading: string
  readonly paragraph: string
}

export interface ChlorideProcessModule {
  readonly id: 'CL-01' | 'CL-02' | 'CL-03' | 'CL-04' | 'CL-05'
  readonly eyebrow?: string
  readonly heading: string
  readonly paragraphs: readonly string[]
  readonly steps: readonly ChlorideProcessStep[]
  readonly actions: readonly ChlorideProcessAction[]
}

export interface MalaysiaChlorideProcessPageDto {
  readonly id: string
  readonly modifiedGmt: string
  readonly identity: {
    readonly pageId: 'PRODUCT-PROC-CL'
    readonly siteScope: 'tio2-my'
    readonly locale: 'en'
    readonly path: '/products/chloride-process-titanium-dioxide/'
    readonly schemaVersion: 'product-process-chloride-v0.1'
  }
  readonly seo: {
    readonly title: string
    readonly description: string
    readonly canonical: 'https://tio2malaysia.com/products/chloride-process-titanium-dioxide/'
    readonly socialImage: null
  }
  readonly breadcrumb: readonly ChlorideProcessAction[]
  readonly modules: readonly ChlorideProcessModule[]
  readonly grades: readonly ChlorideProcessGradeRelation[]
  readonly globalChrome: Tio2MyGlobalChrome
}
