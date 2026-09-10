import {NextResponse, type NextRequest} from 'next/server'

export function proxy(request: NextRequest) {
  // Next reserves /404; route it through the scoped catch-all not-found boundary.
  if (process.env.SITE_ID === 'tio2-my' && /^\/404\/?$/.test(request.nextUrl.pathname)) {
    const recovery = request.nextUrl.clone()
    recovery.pathname = '/__tio2-recovery-404'
    recovery.search = ''
    return NextResponse.rewrite(recovery)
  }
  const pathnameWithoutTrailingSlash = request.nextUrl.pathname.replace(/\/+$/u, '') || '/'
  const isApiPath = pathnameWithoutTrailingSlash === '/api' || pathnameWithoutTrailingSlash.startsWith('/api/')
  const isMalaysiaPagePath = process.env.SITE_ID === 'tio2-my' &&
    pathnameWithoutTrailingSlash !== '/' &&
    !isApiPath

  if (isMalaysiaPagePath && request.nextUrl.pathname === pathnameWithoutTrailingSlash) {
    const canonicalUrl = new URL(request.url)
    canonicalUrl.pathname = `${pathnameWithoutTrailingSlash}/`
    return NextResponse.redirect(canonicalUrl, 308)
  }

  if (
    process.env.SITE_ID !== 'tio2-my' &&
    request.nextUrl.pathname !== '/' &&
    request.nextUrl.pathname.endsWith('/')
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
