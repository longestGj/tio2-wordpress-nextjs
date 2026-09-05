import registry from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-page-registry.json'
import resourceOriginContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-origin.json'

const entries = new Map(registry.entries.map((entry) => [entry.pageId, entry] as const))

export interface MalaysiaResourcePageRequestIdentity {
  readonly pageId: 'RES-ORIGIN'
  readonly siteScope: 'tio2-my'
  readonly locale: 'en'
  readonly path: '/resources/non-china-titanium-dioxide/'
  readonly canonical: 'https://tio2malaysia.com/resources/non-china-titanium-dioxide/'
}

const resourceOriginIdentity: MalaysiaResourcePageRequestIdentity = Object.freeze({
  pageId: 'RES-ORIGIN',
  siteScope: 'tio2-my',
  locale: 'en',
  path: '/resources/non-china-titanium-dioxide/',
  canonical: 'https://tio2malaysia.com/resources/non-china-titanium-dioxide/',
})

export function getApprovedMalaysiaResourceOriginContract() {
  return resourceOriginContract
}

export function resolveMalaysiaResourcePageRequest(
  siteId: string,
  wordpressScope: string,
  path: string,
): MalaysiaResourcePageRequestIdentity | null {
  if (
    siteId !== resourceOriginIdentity.siteScope ||
    wordpressScope !== resourceOriginIdentity.siteScope ||
    path !== resourceOriginIdentity.path
  ) return null

  const entry = entries.get(resourceOriginIdentity.pageId)
  return entry?.canonicalPath === path && entry.publicMappingAllowed
    ? resourceOriginIdentity
    : null
}

export async function loadMalaysiaResourcePageRequest<T>(
  siteId: string,
  wordpressScope: string,
  path: string,
  loader: (identity: MalaysiaResourcePageRequestIdentity) => Promise<T>,
): Promise<T | null> {
  const identity = resolveMalaysiaResourcePageRequest(
    siteId,
    wordpressScope,
    path,
  )
  return identity ? loader(identity) : null
}

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
