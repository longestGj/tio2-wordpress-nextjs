interface TradeEvidence {
  readonly sourceUrl?: string
  readonly url?: string
  readonly sourceTitle?: string
  readonly title?: string
  readonly sourceDate?: string
  readonly checkedDate?: string
  readonly reviewedAt?: string
  readonly applicableScope?: string
  readonly status?: string
}

interface TradeAction {
  readonly label: string
  readonly href: string
}

interface DynamicProjectionInput {
  readonly evidence: TradeEvidence
  readonly importEvidence: TradeEvidence
  readonly routeState: string
  readonly datedContext: string
  readonly action: TradeAction
  readonly originHold: string
  readonly releaseEnabled: boolean
  readonly indexingAuthorized: boolean
  readonly relatedRoutesReady: boolean
  readonly conversionRuntimeReady: boolean
  readonly runtimeAcceptanceReady: boolean
  readonly tradeFreshness: string
  readonly relatedRouteStates: readonly string[]
}

interface RelatedRouteSource {
  readonly relations: Readonly<Record<string, {readonly routeState: string}>>
  readonly applications: {readonly items: readonly {readonly routeState: string}[]}
  readonly grades: {readonly groups: readonly {readonly items: readonly {readonly routeState: string}[]}[]}
  readonly destinations: {readonly items: readonly {readonly routeState: string}[]}
}

export function getMalaysiaEuMarketRelatedRouteStates(source: RelatedRouteSource): readonly string[] {
  return [
    ...Object.values(source.relations).map(({routeState}) => routeState),
    ...source.applications.items.map(({routeState}) => routeState),
    ...source.grades.groups.flatMap(({items}) => items.map(({routeState}) => routeState)),
    ...source.destinations.items.map(({routeState}) => routeState),
  ]
}

function hasCurrentEvidence(evidence: TradeEvidence, requireReviewedAt: boolean): boolean {
  const isIsoDate = (value: unknown) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  let sourceUrl: URL
  try {
    sourceUrl = new URL(evidence.sourceUrl ?? evidence.url ?? '')
  } catch {
    return false
  }
  return evidence.status === 'current' && sourceUrl.protocol === 'https:' && [
    evidence.sourceTitle ?? evidence.title,
    evidence.applicableScope,
  ].every((value) => typeof value === 'string' && value.length > 0)
    && [evidence.sourceDate, evidence.checkedDate].every(isIsoDate)
    && (!requireReviewedAt || isIsoDate(evidence.reviewedAt))
}

export function projectMalaysiaEuMarketDynamicState(input: DynamicProjectionInput) {
  const evidenceCurrent = hasCurrentEvidence(input.evidence, true)
  const importReferenceAvailable = hasCurrentEvidence(input.importEvidence, false)
  const tradeFreshnessCurrent = input.tradeFreshness === `CURRENT_AS_OF_${input.evidence.checkedDate ?? ''}`
  const relatedRoutesAvailable = input.routeState === 'available' &&
    input.relatedRouteStates.length > 0 && input.relatedRouteStates.every((state) => state === 'available')
  const canRelease = input.originHold === 'CLOSED' && input.releaseEnabled &&
    input.relatedRoutesReady && input.conversionRuntimeReady &&
    input.runtimeAcceptanceReady && evidenceCurrent && importReferenceAvailable &&
    tradeFreshnessCurrent && relatedRoutesAvailable
  const datedTrade = input.routeState === 'available' && evidenceCurrent && tradeFreshnessCurrent
    ? {context: input.datedContext, action: input.action}
    : null
  return {
    datedTrade,
    importReferenceAvailable,
    canRelease,
    canIndex: canRelease && input.indexingAuthorized,
  } as const
}
