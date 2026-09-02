import {NextResponse, type NextRequest} from 'next/server'

const DOCUMENT_LANGUAGE_HEADER = 'x-tio2-my-document-language'
const BAHASA_MALAYSIA_PRIVACY_PATH = '/ms/privacy-policy'

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete(DOCUMENT_LANGUAGE_HEADER)

  if (process.env.SITE_ID === 'tio2-my') {
    const pathname = request.nextUrl.pathname.replace(/\/$/u, '') || '/'
    requestHeaders.set(
      DOCUMENT_LANGUAGE_HEADER,
      pathname === BAHASA_MALAYSIA_PRIVACY_PATH ? 'ms-MY' : 'en',
    )
  }

  return NextResponse.next({request: {headers: requestHeaders}})
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)'],
}
