import {NextResponse, type NextRequest} from 'next/server'
import {editorialPageIdForPath} from './lib/editorial/malaysia-editorial-contracts'

const MALAYSIA_TRAILING_SLASH_PATHS = new Set([
  '/markets',
  '/markets/european-union',
  '/markets/united-kingdom',
  '/markets/poland',
  '/products/chloride-process-titanium-dioxide',
  '/documents/certificate-of-origin',
  '/markets/spain',
  '/markets/india',
  '/markets/netherlands',
  '/markets/belgium',
  '/markets/brazil',
  '/pt-br/markets/brazil',
  '/request-documents',
])

export function proxy(request: NextRequest) {
  const pathnameWithoutTrailingSlash = request.nextUrl.pathname.replace(/\/+$/u, '') || '/'
  const isMalaysiaTrailingSlashPath = process.env.SITE_ID === 'tio2-my' &&
    (MALAYSIA_TRAILING_SLASH_PATHS.has(pathnameWithoutTrailingSlash) || Boolean(editorialPageIdForPath(pathnameWithoutTrailingSlash)))

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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)'],
}
