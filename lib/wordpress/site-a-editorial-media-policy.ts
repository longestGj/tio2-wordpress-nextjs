const MEDIA_ORIGIN_ENV = 'WORDPRESS_MEDIA_ORIGIN'
const LOCAL_WORDPRESS_MEDIA_ORIGIN = 'http://localhost:8080'
const WORDPRESS_UPLOADS_PREFIX = '/wp-content/uploads/'
const WORDPRESS_UPLOADS_PATTERN = '/wp-content/uploads/**'

type MediaEnvironment = Readonly<Record<string, string | undefined>>

export interface SiteAEditorialMediaRemotePattern {
  readonly protocol: 'http' | 'https'
  readonly hostname: string
  readonly port: string
  readonly pathname: typeof WORDPRESS_UPLOADS_PATTERN
}

function hasAuthorityUserInfo(value: string): boolean {
  const authority = value.match(
    /^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/iu,
  )?.[1]
  return authority?.includes('@') ?? false
}

function mediaOrigin(
  environment: MediaEnvironment = process.env,
): URL {
  const configured = environment[MEDIA_ORIGIN_ENV]?.trim()
    || LOCAL_WORDPRESS_MEDIA_ORIGIN

  let parsed: URL
  try {
    parsed = new URL(configured)
  } catch {
    throw new Error(
      `${MEDIA_ORIGIN_ENV} must be an HTTP(S) origin without credentials, path, query, or fragment`,
    )
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol)
    || !parsed.hostname
    || parsed.hostname.includes('*')
    || hasAuthorityUserInfo(configured)
    || parsed.username
    || parsed.password
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash
  ) {
    throw new Error(
      `${MEDIA_ORIGIN_ENV} must be an HTTP(S) origin without credentials, path, query, or fragment`,
    )
  }

  return parsed
}

export function siteAEditorialMediaRemotePattern(
  environment: MediaEnvironment = process.env,
): SiteAEditorialMediaRemotePattern {
  const origin = mediaOrigin(environment)
  return {
    protocol: origin.protocol === 'http:' ? 'http' : 'https',
    hostname: origin.hostname,
    port: origin.port,
    pathname: WORDPRESS_UPLOADS_PATTERN,
  }
}

export function isSiteAEditorialMediaUrl(
  value: string,
  environment: MediaEnvironment = process.env,
): boolean {
  if (/\s/u.test(value)) return false

  let candidate: URL
  try {
    candidate = new URL(value)
  } catch {
    return false
  }

  const origin = mediaOrigin(environment)
  return (
    !hasAuthorityUserInfo(value)
    && !candidate.username
    && !candidate.password
    && candidate.origin === origin.origin
    && candidate.pathname.startsWith(WORDPRESS_UPLOADS_PREFIX)
    && candidate.pathname.length > WORDPRESS_UPLOADS_PREFIX.length
  )
}
