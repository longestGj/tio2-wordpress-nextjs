type TargetType = 'application'|'resource'|'product'

export interface ContentGraphIssue {
  sourceId: string
  fieldPath: string
  targetType: TargetType
  targetId: string
}

export interface SiteAEditorialGraphInput {
  applications: unknown
  resources: unknown
  products: unknown
}

type RecordValue = Record<string, unknown>

function object(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null
}

function records(manifest: unknown, key: string): RecordValue[] {
  const value = object(manifest)?.[key]
  return Array.isArray(value) ? value.flatMap((item): RecordValue[] => {
    const record = object(item)
    return record ? [record] : []
  }) : []
}

function stringSet(records: readonly RecordValue[], identityKey: 'identity'|'productId'): Set<string> {
  return new Set(records.flatMap((record) => {
    const value = identityKey === 'identity' ? object(record.identity)?.id : record.productId
    return typeof value === 'string' ? [value] : []
  }))
}

function sourceId(record: RecordValue, key: 'identity'|'productId'): string | null {
  const value = key === 'identity' ? object(record.identity)?.id : record.productId
  return typeof value === 'string' ? value : null
}

function addIssue(issues: ContentGraphIssue[], source: string, fieldPath: string, targetType: unknown, targetId: unknown, known: Readonly<Record<TargetType, ReadonlySet<string>>>): void {
  if ((targetType === 'application' || targetType === 'resource' || targetType === 'product') && typeof targetId === 'string' && !known[targetType].has(targetId)) issues.push({sourceId: source, fieldPath, targetType, targetId})
}

function inspectEditorialRecords(records: readonly RecordValue[], known: Readonly<Record<TargetType, ReadonlySet<string>>>, issues: ContentGraphIssue[]): void {
  records.forEach((record) => {
    const source = sourceId(record, 'identity')
    if (!source) return
    ;(['children', 'relationships'] as const).forEach((field) => {
      const targets = record[field]
      if (!Array.isArray(targets)) return
      targets.forEach((target, index) => {
        const value = object(target)
        addIssue(issues, source, `${field}.${index}`, value?.type, value?.id, known)
      })
    })
  })
}

function inspectProducts(records: readonly RecordValue[], known: Readonly<Record<TargetType, ReadonlySet<string>>>, issues: ContentGraphIssue[]): void {
  records.forEach((record) => {
    const source = sourceId(record, 'productId')
    if (!source) return
    const groups: Array<[string, unknown]> = [
      ['recommendedApplications', record.recommendedApplications],
      ['relatedLinks.applications', object(record.relatedLinks)?.applications],
      ['relatedLinks.resources', object(record.relatedLinks)?.resources],
      ['relatedLinks.products', object(record.relatedLinks)?.products],
    ]
    groups.forEach(([field, targets]) => {
      if (!Array.isArray(targets)) return
      targets.forEach((target, index) => {
        const value = object(target)
        addIssue(issues, source, `${field}.${index}`, value?.targetType, value?.targetKey, known)
      })
    })
  })
}

export function validateSiteAEditorialGraph({applications, resources, products}: SiteAEditorialGraphInput): ContentGraphIssue[] {
  const applicationRecords = records(applications, 'records')
  const resourceRecords = records(resources, 'records')
  const productRecords = records(products, 'products')
  const known = {
    application: stringSet(applicationRecords, 'identity'),
    resource: stringSet(resourceRecords, 'identity'),
    product: stringSet(productRecords, 'productId'),
  }
  const issues: ContentGraphIssue[] = []
  inspectEditorialRecords(applicationRecords, known, issues)
  inspectEditorialRecords(resourceRecords, known, issues)
  inspectProducts(productRecords, known, issues)
  return issues.sort((left, right) => `${left.sourceId}\u0000${left.fieldPath}\u0000${left.targetType}\u0000${left.targetId}`.localeCompare(`${right.sourceId}\u0000${right.fieldPath}\u0000${right.targetType}\u0000${right.targetId}`))
}
