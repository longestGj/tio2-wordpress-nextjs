import {createHmac, timingSafeEqual} from 'node:crypto'
import {draftMode} from 'next/headers'
import {redirect} from 'next/navigation'

import {getCurrentSite} from '@/lib/sites/current-site'
import {isValidPublicPath} from '@/lib/wordpress/cache-tags'
import {getPreviewContentByPath} from '@/lib/wordpress/preview'

export const runtime = 'nodejs'

function signatureMatches(
  signature: string,
  expected: Buffer,
): boolean {
  if (!/^[0-9a-f]{64}$/u.test(signature)) return false
  const actual = Buffer.from(signature, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function GET(request: Request): Promise<Response> {
  const configuredSecret = process.env.PREVIEW_SECRET
  if (!configuredSecret) {
    return Response.json(
      {ok: false, error: 'Preview is not configured'},
      {status: 500},
    )
  }

  let currentSite
  try {
    currentSite = getCurrentSite()
  } catch {
    return Response.json(
      {ok: false, error: 'Site is not configured'},
      {status: 500},
    )
  }

  const url = new URL(request.url)
  const siteId = url.searchParams.get('siteId')
  const path = url.searchParams.get('path') ?? ''
  if (siteId !== currentSite.id || !isValidPublicPath(path)) {
    return Response.json(
      {ok: false, error: 'Invalid preview target'},
      {status: 400},
    )
  }

  const expiresValue = url.searchParams.get('expires') ?? ''
  const expires = /^[1-9][0-9]{0,12}$/u.test(expiresValue)
    ? Number(expiresValue)
    : Number.NaN
  const now = Math.floor(Date.now() / 1000)
  const expectedSignature = createHmac('sha256', configuredSecret)
    .update(`${expiresValue}\n${siteId}\n${path}`)
    .digest()
  if (
    !Number.isSafeInteger(expires) ||
    expires < now ||
    expires > now + 300 ||
    !signatureMatches(
      url.searchParams.get('signature') ?? '',
      expectedSignature,
    )
  ) {
    return Response.json(
      {ok: false, error: 'Invalid preview signature'},
      {status: 401},
    )
  }

  const preview = await getPreviewContentByPath(siteId, path)
  if (!preview) {
    return Response.json({ok: false, error: 'Preview not found'}, {status: 404})
  }

  const draft = await draftMode()
  draft.enable()
  return redirect(path)
}
