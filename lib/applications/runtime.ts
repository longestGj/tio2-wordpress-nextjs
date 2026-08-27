import {
  SITE_A_APPLICATION_IDENTITIES,
} from './content-manifest'
import type {ApplicationPageDto} from './types'

const identityById = new Map<
  string,
  (typeof SITE_A_APPLICATION_IDENTITIES)[number]
>(SITE_A_APPLICATION_IDENTITIES.map((identity) => [identity[0], identity]))

const expectedChildrenById = new Map(
  SITE_A_APPLICATION_IDENTITIES.map(([id]) => [
    id,
    SITE_A_APPLICATION_IDENTITIES.filter((identity) => identity[5] === id).map(
      ([childId]) => childId,
    ),
  ]),
)

const REQUIRED_UNIVERSAL_APPLICATION_EDGES = [
  'coatings',
  'plastics',
  'printing-inks',
] as const

function sameMembers(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  return (
    actualSet.size === actual.length &&
    expectedSet.size === expected.length &&
    actualSet.size === expectedSet.size &&
    [...actualSet].every((id) => expectedSet.has(id))
  )
}

export function hasCanonicalApplicationGraph(
  application: Pick<ApplicationPageDto, 'identity' | 'children' | 'relationships'>,
): boolean {
  const expected = identityById.get(application.identity.id)
  if (
    !expected ||
    application.identity.slug !== expected[1] ||
    application.identity.path !== expected[2] ||
    application.identity.level !== expected[3] ||
    application.identity.family !== expected[4] ||
    application.identity.parentId !== expected[5]
  ) {
    return false
  }

  const childIds = application.children.map(({type, id}) =>
    type === 'application' ? id : '',
  )
  if (!sameMembers(childIds, expectedChildrenById.get(expected[0]) ?? [])) {
    return false
  }

  if (expected[0] !== 'universal-multi-application') return true
  const relatedApplicationIds = new Set(
    application.relationships
      .filter(({type}) => type === 'application')
      .map(({id}) => id),
  )
  return REQUIRED_UNIVERSAL_APPLICATION_EDGES.every((id) =>
    relatedApplicationIds.has(id),
  )
}

export function assertCanonicalApplicationGraph(
  application: Pick<ApplicationPageDto, 'identity' | 'children' | 'relationships'>,
): void {
  if (!hasCanonicalApplicationGraph(application)) {
    throw new Error('Application does not match the canonical Application graph')
  }
}
