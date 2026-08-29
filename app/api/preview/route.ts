import {createHmac, timingSafeEqual} from 'node:crypto'

import {applicationIdentityForPath} from '@/lib/wordpress/application-queries'
import {
  ApplicationPreviewNotFoundError,
  getApplicationPreview,
} from '@/lib/wordpress/application-preview'
import {ApplicationContractError} from '@/lib/applications/dto'
import {ProductContractError} from '@/lib/products/dto'
import {ResourceContractError} from '@/lib/resources/dto'
import {getCurrentSite} from '@/lib/sites/current-site'
import {isValidPublicPath} from '@/lib/wordpress/cache-tags'
import {getPreviewContentByPath} from '@/lib/wordpress/preview'
import {
  getProductPreview,
  ProductPreviewNotFoundError,
} from '@/lib/wordpress/product-preview'
import {resourceIdentityForPath} from '@/lib/wordpress/resource-queries'
import {
  getResourcePreview,
  ResourcePreviewNotFoundError,
} from '@/lib/wordpress/resource-preview'
import {
  createPreviewSessionToken,
  previewSessionCookieName,
} from '@/lib/wordpress/preview-session'
import {
  CrossSiteContentError,
  InvalidContentPathError,
} from '@/lib/wordpress/types'

export const runtime = 'nodejs'

const PRODUCT_PATH_PATTERN = /^\/products\/(tp-[a-z]{1,2}[0-9]{3})$/u

function signatureMatches(
  signature: string,
  expected: Buffer,
): boolean {
  if (!/^[0-9a-f]{64}$/u.test(signature)) return false
  const actual = Buffer.from(signature, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function previewRedirect(
  siteId: string,
  canonicalPath: string,
  browserPath: string,
  expires: number,
  now: number,
  secret: string,
  noStore = false,
): Response {
  const token = createPreviewSessionToken(
    siteId,
    canonicalPath,
    expires,
    secret,
  )
  const attributes = [
    `${previewSessionCookieName(canonicalPath)}=${token}`,
    `Path=${browserPath}`,
    `Expires=${new Date(expires * 1000).toUTCString()}`,
    `Max-Age=${expires - now}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (process.env.NODE_ENV === 'production') attributes.push('Secure')
  const headers = new Headers({
    location: browserPath,
    'set-cookie': attributes.join('; '),
  })
  if (noStore) {
    headers.set('cache-control', 'private, no-store, max-age=0')
  }
  return new Response(null, {status: 307, headers})
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

  const exactSiteA =
    currentSite.id === 'tio2-a' && currentSite.wordpressScope === 'tio2-a'
  const applicationIdentity = exactSiteA ? applicationIdentityForPath(path) : null
  if (applicationIdentity?.[2] === path) {
    try {
      await getApplicationPreview(currentSite, path)
    } catch (error) {
      if (
        error instanceof ApplicationPreviewNotFoundError ||
        error instanceof CrossSiteContentError ||
        error instanceof InvalidContentPathError
      ) {
        return Response.json(
          {ok: false, error: 'Preview not found'},
          {status: 404},
        )
      }
      if (error instanceof ApplicationContractError) {
        return Response.json(
          {ok: false, error: 'Preview source is unavailable'},
          {status: 502},
        )
      }
      return Response.json(
        {ok: false, error: 'Preview source is unavailable'},
        {status: 502},
      )
    }
    const browserPath =
      applicationIdentity[3] === 'hub'
        ? '/preview/applications'
        : `/preview/applications/${applicationIdentity[1]}`
    return previewRedirect(
      siteId,
      path,
      browserPath,
      expires,
      now,
      configuredSecret,
      true,
    )
  }

  const resourceIdentity = exactSiteA ? resourceIdentityForPath(path) : null
  if (resourceIdentity?.[2] === path) {
    try {
      await getResourcePreview(currentSite, path)
    } catch (error) {
      if (
        error instanceof ResourcePreviewNotFoundError ||
        error instanceof CrossSiteContentError ||
        error instanceof InvalidContentPathError
      ) {
        return Response.json(
          {ok: false, error: 'Preview not found'},
          {status: 404},
        )
      }
      if (error instanceof ResourceContractError) {
        return Response.json(
          {ok: false, error: 'Preview source is unavailable'},
          {status: 502},
        )
      }
      return Response.json(
        {ok: false, error: 'Preview source is unavailable'},
        {status: 502},
      )
    }
    const browserPath =
      resourceIdentity[3] === 'hub'
        ? '/preview/resources'
        : `/preview/resources/${resourceIdentity[1]}`
    return previewRedirect(
      siteId,
      path,
      browserPath,
      expires,
      now,
      configuredSecret,
      true,
    )
  }

  const productMatch = PRODUCT_PATH_PATTERN.exec(path)
  if (productMatch?.[1]) {
    try {
      await getProductPreview(currentSite, path)
    } catch (error) {
      if (
        error instanceof ProductPreviewNotFoundError ||
        error instanceof CrossSiteContentError ||
        error instanceof InvalidContentPathError
      ) {
        return Response.json(
          {ok: false, error: 'Preview not found'},
          {status: 404},
        )
      }
      if (error instanceof ProductContractError) {
        return Response.json(
          {ok: false, error: 'Preview source is unavailable'},
          {status: 502},
        )
      }
      return Response.json(
        {ok: false, error: 'Preview source is unavailable'},
        {status: 502},
      )
    }

    return previewRedirect(
      siteId,
      path,
      `/preview/products/${productMatch[1]}`,
      expires,
      now,
      configuredSecret,
    )
  }

  let preview
  try {
    preview = await getPreviewContentByPath(siteId, path)
  } catch (error) {
    if (
      error instanceof CrossSiteContentError ||
      error instanceof InvalidContentPathError
    ) {
      return Response.json(
        {ok: false, error: 'Preview not found'},
        {status: 404},
      )
    }
    return Response.json(
      {ok: false, error: 'Preview source is unavailable'},
      {status: 502},
    )
  }
  if (!preview || preview.status !== 'draft') {
    return Response.json({ok: false, error: 'Preview not found'}, {status: 404})
  }

  return previewRedirect(
    siteId,
    path,
    path,
    expires,
    now,
    configuredSecret,
  )
}
