import {NextResponse, type NextRequest} from 'next/server'

const DOCUMENT_LANGUAGE_HEADER = 'x-tio2-my-document-language'
const BAHASA_MALAYSIA_PRIVACY_PATH = '/ms/privacy-policy'

export function proxy(request: NextRequest) {
  if (process.env.SITE_ID === 'tio2-my' && request.nextUrl.pathname === '/markets') {
    const canonicalUrl = new URL(request.url)
    canonicalUrl.pathname = '/markets/'
    return NextResponse.redirect(canonicalUrl, 308)
  }

  if (
    request.nextUrl.pathname !== '/' &&
    request.nextUrl.pathname.endsWith('/') &&
    !(process.env.SITE_ID === 'tio2-my' && request.nextUrl.pathname === '/markets/')
  ) {
    const canonicalUrl = new URL(request.url)
    canonicalUrl.pathname = request.nextUrl.pathname.replace(/\/+$/u, '')
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
