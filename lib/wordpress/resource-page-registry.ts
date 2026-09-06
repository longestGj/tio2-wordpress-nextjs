import registry from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-page-registry.json'

const entries = new Map(registry.entries.map((entry) => [entry.pageId, entry] as const))

export function malaysiaResourceMappingAllowsPublic(
  pageId: string,
  mappingStatus: string,
  canonicalPath: string,
): boolean {
  const entry = entries.get(pageId)
  return Boolean(
    entry?.publicMappingAllowed &&
    entry.mappingStatus === mappingStatus &&
    entry.canonicalPath === canonicalPath,
  )
}
