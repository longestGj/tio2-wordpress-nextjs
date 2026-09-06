export interface MalaysiaResourceProcArticleMetadata {
  readonly authorName: string
  readonly publisherName: string
  readonly publisherLogoAssetKey: string
  readonly datePublished: string
  readonly dateModified: string
  readonly lastReviewedAt: string
  readonly maintenanceOwner: string
}

type UnknownRecord = Record<string, unknown>

const publicKeys = [
  'authorName',
  'dateModified',
  'datePublished',
  'lastReviewedAt',
  'maintenanceOwner',
  'publisherLogoAssetKey',
  'publisherName',
] as const

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value) && value.trim() === value
}

function isoDate(value: unknown): value is string {
  if (!nonempty(value) || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function publicMetadata(value: unknown): MalaysiaResourceProcArticleMetadata | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as UnknownRecord
  if (Object.keys(item).sort().join('|') !== [...publicKeys].sort().join('|')) return null
  if (
    !nonempty(item.authorName) ||
    !nonempty(item.publisherName) ||
    item.publisherLogoAssetKey !== '/tio2-my/brand/tio2-malaysia-primary-horizontal-v0.1.svg' ||
    !isoDate(item.datePublished) ||
    !isoDate(item.dateModified) ||
    !isoDate(item.lastReviewedAt) ||
    !nonempty(item.maintenanceOwner)
  ) return null
  return {
    authorName: item.authorName,
    publisherName: item.publisherName,
    publisherLogoAssetKey: item.publisherLogoAssetKey,
    datePublished: item.datePublished,
    dateModified: item.dateModified,
    lastReviewedAt: item.lastReviewedAt,
    maintenanceOwner: item.maintenanceOwner,
  }
}

export function projectApprovedMalaysiaResourceProcArticleMetadata(
  value: unknown,
): MalaysiaResourceProcArticleMetadata | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as UnknownRecord
  if (item.contentStatus !== 'APPROVED' || item.publicVisibilityStatus !== 'VISIBLE') return null
  return publicMetadata(Object.fromEntries(publicKeys.map((key) => [key, item[key]])))
}

export function resolveVisibleMalaysiaResourceProcArticleMetadata(
  schemaMode: unknown,
  value: unknown,
): MalaysiaResourceProcArticleMetadata | null {
  return schemaMode === 'ARTICLE_WITH_BREADCRUMB' ? publicMetadata(value) : null
}
