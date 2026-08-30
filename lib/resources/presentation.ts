import type {SiteAResourceId} from './content-manifest'

export type ResourcePresentationMode =
  | 'hub'
  | 'technical-explainer'
  | 'evaluation-guide'

export interface ResourceGuideItem {
  readonly label: string
  readonly targetId: string
}

export interface ResourceScorecardData {
  readonly heading: string
  readonly columns: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

export const ARTICLE_07_SCORECARD = Object.freeze({
  heading: 'Cross-application scorecard',
  columns: [
    'Evaluation area',
    'Coatings',
    'Plastics and masterbatch',
    'Inks',
    'Other systems',
  ],
  rows: [
    [
      'Appearance and optics',
      'Hiding, colour, gloss, film uniformity and visual defects',
      'Whiteness, undertone, opacity, streaking and surface appearance',
      'Hiding, colour, print appearance and uniformity',
      'Define the relevant optical or visual requirement for the finished system',
    ],
    [
      'Dispersion',
      'Fineness, agglomerates, grind response and film consistency',
      'Dispersion quality, specks, filter-pressure behavior where relevant and distribution in the polymer',
      'Milling response, fineness, coarse particles and print consistency',
      'Use a system-appropriate dispersion or particle-distribution check',
    ],
    [
      'Rheology or melt flow',
      'Low- and high-shear viscosity, flow, sag or application response',
      'Melt flow, pressure, torque, throughput and process stability',
      'Viscosity, flow, transfer and printability',
      'Select the processing variable that governs the system',
    ],
    [
      'Processing',
      'Mixing, grinding, let-down, application and cure conditions',
      'Feeding, compounding, extrusion, molding or film conversion',
      'Milling, filtration, printing and drying',
      'Use representative equipment and conditions',
    ],
    [
      'Storage',
      'Viscosity drift, settling, redispersion and package stability',
      'Handling, moisture control and retained processing behavior where relevant',
      'Settling, redispersion, filtration and viscosity stability',
      'Define the actual storage and handling exposure',
    ],
    [
      'Finished performance',
      'Adhesion, film integrity, scrub, gloss retention or other specified film properties',
      'Mechanical properties, finished-part appearance and use-related performance',
      'Rub, adhesion, print durability or other print requirements',
      'Establish product-specific functional tests before screening',
    ],
    [
      'Application-specific durability',
      'Exposure, chalking, colour or gloss retention where applicable',
      'Weathering, heat-aging or retained appearance where applicable',
      'Resistance or exposure testing relevant to the printed article',
      'Use the end-use exposure and approval method appropriate to the system',
    ],
  ],
} satisfies ResourceScorecardData)

export interface ResourcePresentation {
  readonly mode: ResourcePresentationMode
  readonly decisionSteps: readonly [string, string, string, string]
  readonly heroSummary: readonly (
    readonly [label: string, value: string]
  )[]
  readonly guideItems: readonly ResourceGuideItem[]
  readonly suppressedSectionIds: readonly string[]
  readonly comparisonVariant: 'none' | 'table' | 'examples' | 'stages'
  readonly comparisonAfterBodySectionId: string | null
}

export interface ResourceLearningPath {
  readonly id: 'fundamentals' | 'performance' | 'replacement' | 'testing'
  readonly label: string
  readonly intro: string
  readonly articleIds: readonly SiteAResourceId[]
}

const explainerGuideItems = [
  {label: 'Direct answer', targetId: 'resource-direct-answer'},
  {label: 'Meaning and limits', targetId: 'resource-body-section-1'},
  {label: 'System impact', targetId: 'resource-practical-implications'},
  {label: 'Comparison', targetId: 'resource-comparison'},
  {label: 'Common misconceptions', targetId: 'resource-common-mistakes'},
  {label: 'Practical validation', targetId: 'resource-evaluation-method'},
] as const

const evaluationGuideItems = [
  {label: 'Problem definition', targetId: 'resource-direct-answer'},
  {label: 'Required inputs', targetId: 'resource-body-section-1'},
  {label: 'Controlled comparison', targetId: 'resource-comparison'},
  {label: 'Measurements and criteria', targetId: 'resource-practical-implications'},
  {label: 'Failure interpretation', targetId: 'resource-common-mistakes'},
  {label: 'Approval boundary', targetId: 'resource-evaluation-method'},
] as const

export const RESOURCE_LEARNING_PATHS = Object.freeze([
  {
    id: 'fundamentals',
    label: 'TiO₂ Fundamentals',
    intro: 'Use these guides to understand what crystal form, production route and TiO₂ content can tell you—and what they cannot predict about finished-system performance.',
    articleIds: ['article-01', 'article-02', 'article-03'],
  },
  {
    id: 'performance',
    label: 'Performance Interpretation',
    intro: 'Use these guides to interpret oil absorption, CBU and surface treatment without treating any single powder property as a prediction of finished-system performance.',
    articleIds: ['article-04', 'article-05', 'article-06'],
  },
  {
    id: 'replacement',
    label: 'Grade Replacement',
    intro: 'Use this guide to structure a controlled grade-replacement decision from the current control through laboratory screening, justified adjustment and production validation.',
    articleIds: ['article-07'],
  },
  {
    id: 'testing',
    label: 'Application Testing',
    intro: 'Use these guides to plan controlled tests for high-PVC cost, polycarbonate stability and outdoor durability questions.',
    articleIds: ['article-08', 'article-09', 'article-10'],
  },
] satisfies readonly ResourceLearningPath[])

export const RESOURCE_HUB_CARD_SUMMARY_BY_ID = Object.freeze({
  'article-01': 'Compare rutile and anatase titanium dioxide by optical needs, weathering, formulation and testing to choose a sound starting point for your application.',
  'article-02': 'Compare chloride and sulfate titanium dioxide routes, then select and qualify a pigment by crystal form, treatment, dispersion and application needs.',
  'article-03': 'Learn why TiO₂ content alone cannot predict finished performance. Compare surface treatment, dispersion, formulation, processing and validation by application.',
  'article-04': 'Understand titanium dioxide oil absorption, why method matching matters, and how to evaluate formulation effects in inks and high-PVC coatings.',
  'article-05': 'Learn what carbon black undertone (CBU) means for titanium dioxide, why its method matters, and how to compare pigments in controlled plastics trials.',
  'article-06': 'Learn how inorganic and organic titanium dioxide surface treatments influence dispersion, rheology, durability direction and coating validation.',
  'article-07': 'Use a staged framework to evaluate a titanium dioxide alternative grade through controlled lab comparison, formulation adjustment and production validation.',
  'article-08': 'Learn how to evaluate TiO₂ cost in high-PVC flat paint through PVC/CPVC, pigment spacing, extenders and verified hiding and film performance.',
  'article-09': 'Learn why titanium dioxide may affect polycarbonate yellowing or degradation, and how to validate moisture, heat history, flow, color and part quality.',
  'article-10': 'Choose titanium dioxide for outdoor durability by defining exposure, formulation and finish, then validating color, gloss and chalking in use.',
} satisfies Readonly<Partial<Record<SiteAResourceId, string>>>)

export const RESOURCE_HUB_HOW_TO_USE = Object.freeze([
  {
    title: 'Understand the property',
    description:
      'Use what the value or characteristic actually represents.',
  },
  {
    title: 'Compare the right variables',
    description:
      'Avoid treating a single specification as a complete decision.',
  },
  {
    title: 'Validate in your formulation',
    description: 'Use application testing before final grade approval.',
  },
] as const)

const hubDecisionSteps = [
  'Fundamentals',
  'Interpretation',
  'Replacement',
  'Application testing',
] as const

const explainerDecisionSteps = [
  'Answer',
  'Interpret',
  'Compare',
  'Validate',
] as const

const evaluationDecisionSteps = [
  'Define',
  'Control',
  'Evaluate',
  'Approve',
] as const

const heroSummaryByMode = {
  hub: [
    ['Browse by', 'Technical question'],
    ['Library', '10 practical guides'],
    ['Use for', 'Comparison planning'],
    ['Boundary', 'Validate in application'],
  ],
  'technical-explainer': [
    ['Topic', 'Technical interpretation'],
    ['Use for', 'Controlled screening'],
    ['Limit', 'Not finished-system proof'],
    ['Next step', 'Application validation'],
  ],
  'evaluation-guide': [
    ['Decision', 'Controlled evaluation'],
    ['Starting point', 'Current control'],
    ['Method', 'Matched comparison'],
    ['Final step', 'Finished-product approval'],
  ],
} as const satisfies Readonly<
  Record<
    ResourcePresentationMode,
    readonly (readonly [label: string, value: string])[]
  >
>

const article07GuideItems = [
  {label: 'Current control', targetId: 'resource-body-section-1'},
  {label: 'Six-stage decision path', targetId: 'resource-stage-framework'},
  {label: 'Same-formulation lab screen', targetId: 'resource-body-section-3'},
  {label: 'Cross-application scorecard', targetId: 'resource-scorecard'},
  {label: 'Application interpretation', targetId: 'resource-body-section-5'},
  {label: 'When TDS comparison is not enough', targetId: 'resource-body-section-6'},
] as const

export const RESOURCE_PRESENTATION_BY_ID = Object.freeze({
  'resources-hub': {
    mode: 'hub',
    decisionSteps: hubDecisionSteps,
    heroSummary: heroSummaryByMode.hub,
    guideItems: [],
    suppressedSectionIds: [],
    comparisonVariant: 'none',
    comparisonAfterBodySectionId: null,
  },
  'article-01': {
    mode: 'technical-explainer',
    decisionSteps: explainerDecisionSteps,
    heroSummary: heroSummaryByMode['technical-explainer'],
    guideItems: explainerGuideItems,
    suppressedSectionIds: [],
    comparisonVariant: 'table',
    comparisonAfterBodySectionId: 'section-2',
  },
  'article-02': {
    mode: 'technical-explainer',
    decisionSteps: explainerDecisionSteps,
    heroSummary: heroSummaryByMode['technical-explainer'],
    guideItems: explainerGuideItems,
    suppressedSectionIds: [],
    comparisonVariant: 'table',
    comparisonAfterBodySectionId: 'section-3',
  },
  'article-03': {
    mode: 'technical-explainer',
    decisionSteps: explainerDecisionSteps,
    heroSummary: heroSummaryByMode['technical-explainer'],
    guideItems: explainerGuideItems,
    suppressedSectionIds: [],
    comparisonVariant: 'table',
    comparisonAfterBodySectionId: 'section-4',
  },
  'article-04': {
    mode: 'technical-explainer',
    decisionSteps: explainerDecisionSteps,
    heroSummary: heroSummaryByMode['technical-explainer'],
    guideItems: explainerGuideItems,
    suppressedSectionIds: ['section-7'],
    comparisonVariant: 'examples',
    comparisonAfterBodySectionId: 'section-5',
  },
  'article-05': {
    mode: 'technical-explainer',
    decisionSteps: explainerDecisionSteps,
    heroSummary: heroSummaryByMode['technical-explainer'],
    guideItems: explainerGuideItems,
    suppressedSectionIds: [],
    comparisonVariant: 'table',
    comparisonAfterBodySectionId: 'section-5',
  },
  'article-06': {
    mode: 'technical-explainer',
    decisionSteps: explainerDecisionSteps,
    heroSummary: heroSummaryByMode['technical-explainer'],
    guideItems: explainerGuideItems,
    suppressedSectionIds: [],
    comparisonVariant: 'table',
    comparisonAfterBodySectionId: 'section-5',
  },
  'article-07': {
    mode: 'evaluation-guide',
    decisionSteps: evaluationDecisionSteps,
    heroSummary: heroSummaryByMode['evaluation-guide'],
    guideItems: article07GuideItems,
    suppressedSectionIds: ['section-4'],
    comparisonVariant: 'stages',
    comparisonAfterBodySectionId: null,
  },
  'article-08': {
    mode: 'evaluation-guide',
    decisionSteps: evaluationDecisionSteps,
    heroSummary: heroSummaryByMode['evaluation-guide'],
    guideItems: evaluationGuideItems,
    suppressedSectionIds: [],
    comparisonVariant: 'table',
    comparisonAfterBodySectionId: null,
  },
  'article-09': {
    mode: 'evaluation-guide',
    decisionSteps: evaluationDecisionSteps,
    heroSummary: heroSummaryByMode['evaluation-guide'],
    guideItems: evaluationGuideItems,
    suppressedSectionIds: [],
    comparisonVariant: 'table',
    comparisonAfterBodySectionId: null,
  },
  'article-10': {
    mode: 'evaluation-guide',
    decisionSteps: evaluationDecisionSteps,
    heroSummary: heroSummaryByMode['evaluation-guide'],
    guideItems: evaluationGuideItems,
    suppressedSectionIds: [],
    comparisonVariant: 'table',
    comparisonAfterBodySectionId: null,
  },
} satisfies Readonly<Record<SiteAResourceId, ResourcePresentation>>)

export function resolveResourcePresentation(
  id: string,
): ResourcePresentation | null {
  return Object.prototype.hasOwnProperty.call(RESOURCE_PRESENTATION_BY_ID, id)
    ? RESOURCE_PRESENTATION_BY_ID[id as SiteAResourceId]
    : null
}
