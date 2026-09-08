import {NextResponse, type NextRequest} from 'next/server'

import {
  createMalaysiaRfqAttributionToken,
  resolveMalaysiaRfqRefererSource,
  MALAYSIA_RFQ_ATTRIBUTION_COOKIE,
  MALAYSIA_RFQ_ATTRIBUTION_MAX_AGE_SECONDS,
} from '@/lib/rfq/malaysia-rfq-private-attribution'

export function POST(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || request.headers.get('host')
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProtocol || new URL(request.url).protocol.replace(/:$/u, '')
  const effectiveRequestUrl = host ? `${protocol}://${host}` : request.url
  const source = resolveMalaysiaRfqRefererSource(effectiveRequestUrl, request.headers.get('referer'))
  const token = source ? createMalaysiaRfqAttributionToken(process.env.TIO2_MY_RFQ_ATTRIBUTION_SECRET, source) : null
  if (!token) {
    return new NextResponse(null, {status: 404, headers: {'cache-control': 'no-store'}})
  }
  const response = new NextResponse(null, {status: 204, headers: {'cache-control': 'no-store'}})
  response.cookies.set(MALAYSIA_RFQ_ATTRIBUTION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: MALAYSIA_RFQ_ATTRIBUTION_MAX_AGE_SECONDS,
  })
  return response
}
