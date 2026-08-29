import {createHash, createHmac, timingSafeEqual} from 'node:crypto'
import {cookies} from 'next/headers'

import {isValidPublicPath} from './cache-tags'

export const PREVIEW_SESSION_COOKIE = 'tio2_preview_scope'

export function previewSessionCookieName(path: string): string {
  return `${PREVIEW_SESSION_COOKIE}_${createHash('sha256').update(path).digest('hex').slice(0, 16)}`
}

interface PreviewSessionPayload {
  readonly v: 1
  readonly siteId: string
  readonly path: string
  readonly expires: number
}

function signPayload(encodedPayload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(encodedPayload).digest()
}

export function createPreviewSessionToken(
  siteId: string,
  path: string,
  expires: number,
  secret: string,
): string {
  const payload: PreviewSessionPayload = {v: 1, siteId, path, expires}
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  )
  return `${encodedPayload}.${signPayload(encodedPayload, secret).toString('base64url')}`
}

export function isValidPreviewSessionToken(
  token: string,
  secret: string,
  siteId: string,
  path: string,
  now = Math.floor(Date.now() / 1000),
): boolean {
  if (token.length > 2048) return false
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false

  let actualSignature: Buffer
  try {
    actualSignature = Buffer.from(parts[1], 'base64url')
  } catch {
    return false
  }
  const expectedSignature = signPayload(parts[0], secret)
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return false
  }

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  } catch {
    return false
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false
  }
  const candidate = payload as Record<string, unknown>
  if (
    Object.keys(candidate).sort().join(',') !== 'expires,path,siteId,v' ||
    candidate.v !== 1 ||
    candidate.siteId !== siteId ||
    candidate.path !== path ||
    !isValidPublicPath(path) ||
    !Number.isSafeInteger(candidate.expires) ||
    (candidate.expires as number) <= now ||
    (candidate.expires as number) > now + 300
  ) {
    return false
  }

  return true
}

export async function hasScopedPreviewSession(
  siteId: string,
  path: string,
): Promise<boolean> {
  const secret = process.env.PREVIEW_SECRET
  if (!secret) return false
  const cookieStore = await cookies()
  const token = cookieStore.get(previewSessionCookieName(path))?.value
  return token
    ? isValidPreviewSessionToken(token, secret, siteId, path)
    : false
}
