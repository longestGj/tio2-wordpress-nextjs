const CHLORIDE_PROCESS_PATH = '/products/chloride-process-titanium-dioxide/' as const

export interface MalaysiaChlorideProcessRequestIdentity {
  readonly pageId: 'PRODUCT-PROC-CL'
  readonly siteScope: 'tio2-my'
  readonly locale: 'en'
  readonly path: typeof CHLORIDE_PROCESS_PATH
  readonly canonical: 'https://tio2malaysia.com/products/chloride-process-titanium-dioxide/'
}

export function resolveMalaysiaChlorideProcessRequest(
  siteId: string,
  wordpressScope: string,
  path: string,
): MalaysiaChlorideProcessRequestIdentity | null {
  if (siteId !== 'tio2-my' || wordpressScope !== 'tio2-my' || path !== CHLORIDE_PROCESS_PATH) {
    return null
  }
  return {
    pageId: 'PRODUCT-PROC-CL',
    siteScope: 'tio2-my',
    locale: 'en',
    path: CHLORIDE_PROCESS_PATH,
    canonical: 'https://tio2malaysia.com/products/chloride-process-titanium-dioxide/',
  }
}

export async function loadMalaysiaChlorideProcessRequest<T>(
  siteId: string,
  wordpressScope: string,
  path: string,
  loader: (identity: MalaysiaChlorideProcessRequestIdentity) => Promise<T>,
): Promise<T | null> {
  const identity = resolveMalaysiaChlorideProcessRequest(siteId, wordpressScope, path)
  return identity ? loader(identity) : null
}
