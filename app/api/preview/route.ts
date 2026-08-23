import {createHash, timingSafeEqual} from 'node:crypto'
import {draftMode} from 'next/headers'
import {redirect} from 'next/navigation'

import {getCurrentSite} from '@/lib/sites/current-site'
import {isValidPublicPath} from '@/lib/wordpress/cache-tags'

export const runtime = 'nodejs'

function secretsMatch(actual: string, expected: string): boolean {
  const actualHash = createHash('sha256').update(actual).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(actualHash, expectedHash)
}

export async function GET(request: Request): Promise<Response> {
  const configuredSecret = process.env.PREVIEW_SECRET
  if (!configuredSecret) {
    return Response.json(
      {ok: false, error: 'Preview is not configured'},
      {status: 500},
    )
  }

  const url = new URL(request.url)
  const suppliedSecret = url.searchParams.get('secret') ?? ''
  if (!secretsMatch(suppliedSecret, configuredSecret)) {
    return Response.json({ok: false, error: 'Invalid secret'}, {status: 401})
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

  const siteId = url.searchParams.get('siteId')
  const path = url.searchParams.get('path') ?? ''
  if (siteId !== currentSite.id || !isValidPublicPath(path)) {
    return Response.json(
      {ok: false, error: 'Invalid preview target'},
      {status: 400},
    )
  }

  const draft = await draftMode()
  draft.enable()
  return redirect(path)
}
