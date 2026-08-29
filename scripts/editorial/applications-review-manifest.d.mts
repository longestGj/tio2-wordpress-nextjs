export const APPROVED_APPLICATION_REVIEW_IDS: readonly string[]

export interface ApplicationReviewManifest {
  readonly version: string
  readonly siteId: string
  readonly records: Array<{
    readonly identity: {readonly id: string}
    readonly [key: string]: unknown
  }>
  readonly [key: string]: unknown
}

export interface ApplicationReviewPlan {
  readonly actions: Array<{
    readonly entityType: string
    readonly id: string
    readonly action: string
    readonly [key: string]: unknown
  }>
  readonly [key: string]: unknown
}

export function mergeApprovedApplicationRepresentatives(
  canonicalManifest: ApplicationReviewManifest,
  representativeManifest: ApplicationReviewManifest,
  approvedIds?: readonly string[],
): ApplicationReviewManifest

export function assertOnlyApprovedApplicationChanges(
  plan: ApplicationReviewPlan,
  approvedIds?: readonly string[],
): string[]
