import {NextResponse, type NextRequest} from 'next/server'

import {
  createMalaysiaRfqAttributionToken,
  isMalaysiaApplicationHubReferer,
  MALAYSIA_RFQ_ATTRIBUTION_COOKIE,
  MALAYSIA_RFQ_ATTRIBUTION_MAX_AGE_SECONDS,
} from '@/lib/rfq/malaysia-rfq-private-attribution'

export function POST(request: NextRequest) {
  const token = createMalaysiaRfqAttributionToken(process.env.TIO2_MY_RFQ_ATTRIBUTION_SECRET)
  if (!token || !isMalaysiaApplicationHubReferer(request.url, request.headers.get('referer'))) {
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
