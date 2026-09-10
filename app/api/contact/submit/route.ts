import {NextResponse, type NextRequest} from 'next/server'

import {getCurrentSite} from '@/lib/sites/current-site'
import {isExactMalaysiaContactPayload, validateMalaysiaContactValues} from '@/lib/contact/malaysia-contact-validation'

export const runtime = 'nodejs'
const headers = {'cache-control': 'no-store'}
const unconfirmed = (status: number) => NextResponse.json({kind: 'submission_unconfirmed'}, {status, headers})

export async function POST(request: NextRequest) {
  let siteId: string
  try { siteId = getCurrentSite().id } catch { return unconfirmed(404) }
  if (siteId !== 'tio2-my') return unconfirmed(404)
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return unconfirmed(415)

  let body: unknown
  try {
    const text = await request.text()
    if (Buffer.byteLength(text, 'utf8') > 16_384) return unconfirmed(413)
    body = JSON.parse(text)
  } catch { return unconfirmed(400) }
  if (!isExactMalaysiaContactPayload(body)) return unconfirmed(400)

  const errors = validateMalaysiaContactValues(body)
  if (Object.keys(errors).length) return NextResponse.json({kind: 'validation_failed', errors}, {status: 400, headers})

  // CONTACT-DEP03/04/06 remain open. No processor, receiver, positive predicate,
  // or privacy parity has been approved for Contact, so valid input stops here.
  return unconfirmed(503)
}
