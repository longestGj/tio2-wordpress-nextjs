import {NextResponse, type NextRequest} from 'next/server'

const DOCUMENT_LANGUAGE_HEADER = 'x-tio2-my-document-language'
const BAHASA_MALAYSIA_PRIVACY_PATH = '/ms/privacy-policy'
const MALAYSIA_TRAILING_SLASH_PATHS = new Set([
  '/markets',
  '/markets/european-union',
  '/markets/united-kingdom',
  '/request-documents',
])

export function proxy(request: NextRequest) {
  const pathnameWithoutTrailingSlash = request.nextUrl.pathname.replace(/\/+$/u, '') || '/'
  const isMalaysiaTrailingSlashPath = process.env.SITE_ID === 'tio2-my' &&
    MALAYSIA_TRAILING_SLASH_PATHS.has(pathnameWithoutTrailingSlash)

  if (isMalaysiaTrailingSlashPath && request.nextUrl.pathname === pathnameWithoutTrailingSlash) {
    const canonicalUrl = new URL(request.url)
    canonicalUrl.pathname = `${pathnameWithoutTrailingSlash}/`
    return NextResponse.redirect(canonicalUrl, 308)
  }

  if (
    request.nextUrl.pathname !== '/' &&
    request.nextUrl.pathname.endsWith('/') &&
    !isMalaysiaTrailingSlashPath
  ) {
    const canonicalUrl = new URL(request.url)
    canonicalUrl.pathname = pathnameWithoutTrailingSlash
    return NextResponse.redirect(canonicalUrl, 308)
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete(DOCUMENT_LANGUAGE_HEADER)

  if (process.env.SITE_ID === 'tio2-my' && !request.nextUrl.pathname.startsWith('/api/')) {
    const pathname = request.nextUrl.pathname.replace(/\/$/u, '') || '/'
    requestHeaders.set(
      DOCUMENT_LANGUAGE_HEADER,
      pathname === BAHASA_MALAYSIA_PRIVACY_PATH ? 'ms-MY' : 'en',
    )
  }

  return NextResponse.next({request: {headers: requestHeaders}})
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)'],
}
