import {createHmac, timingSafeEqual} from 'node:crypto'

import {getCurrentSite} from '@/lib/sites/current-site'
import {isValidPublicPath} from '@/lib/wordpress/cache-tags'
import {getPreviewContentByPath} from '@/lib/wordpress/preview'
import {
  createPreviewSessionToken,
  PREVIEW_SESSION_COOKIE,
} from '@/lib/wordpress/preview-session'

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
    expires <= now ||
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

  const token = createPreviewSessionToken(siteId, path, expires, configuredSecret)
  const attributes = [
    `${PREVIEW_SESSION_COOKIE}=${token}`,
    `Path=${path}`,
    `Expires=${new Date(expires * 1000).toUTCString()}`,
    `Max-Age=${expires - now}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (process.env.NODE_ENV === 'production') attributes.push('Secure')
  return new Response(null, {
    status: 307,
    headers: {
      location: new URL(path, request.url).toString(),
      'set-cookie': attributes.join('; '),
    },
  })
}
