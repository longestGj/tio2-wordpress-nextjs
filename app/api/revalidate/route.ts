import {createHmac, timingSafeEqual} from 'node:crypto'
import {revalidatePath, revalidateTag} from 'next/cache'
import {z} from 'zod'

import {SITE_A_APPLICATION_IDENTITIES} from '@/lib/applications/content-manifest'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'
import {resolveProductPageIdentity} from '@/lib/products/page-graph'
import {getCurrentSite} from '@/lib/sites/current-site'
import {SITE_IDS} from '@/sites'
import {
  aboutPageContentTag,
  applicationListTag,
  applicationTag,
  contentListTag,
  entityTag,
  homepageContentTag,
  isValidPublicPath,
  marketHubContentTag,
  normalizePublicPath,
  productListTag,
  productDetailTag,
  productFamilyTag,
  productsHubTag,
  resourceListTag,
  resourceHubContentTag,
  resourceTag,
  routeTag,
  siteTag,
  sitemapTag,
} from '@/lib/wordpress/cache-tags'
import {getApprovedProductPagePaths, isPublicRoute} from '@/sites/public-routes'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 64 * 1024
const MAX_EVENT_AGE_MS = 5 * 60 * 1000
const EVENT_TTL_MS = 10 * 60 * 1000
const MAX_EVENT_IDS = 1024
const processedEventIds = new Map<string, number>()

const uniqueArray = <T>(values: readonly T[]): boolean =>
  new Set(values).size === values.length

const normalizedPathSchema = z
  .string()
  .refine(isValidPublicPath)
  .transform(normalizePublicPath)

const payloadSchema = z
  .object({
    eventId: z.uuid(),
    siteIds: z
      .array(z.enum(SITE_IDS))
      .length(1)
      .refine(uniqueArray),
    contentId: z.number().int().positive().safe(),
    paths: z
      .array(normalizedPathSchema)
      .transform((paths) => [...new Set(paths)])
      .refine((paths) => paths.length <= 256),
    entityIds: z
      .array(z.number().int().positive().safe())
      .max(256)
      .refine(uniqueArray),
    modified: z.iso.datetime({offset: true}),
  })
  .strict()

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, {status})
}

function hasValidSignature(
  rawBody: Uint8Array,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !/^[0-9a-f]{64}$/u.test(signature)) {
    return false
  }

  const actual = Buffer.from(signature, 'hex')
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function validateDeclaredLength(value: string | null): 400 | 413 | null {
  if (value === null) return null
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) return 400
  if (value.length > 5 || Number(value) > MAX_BODY_BYTES) return 413
  return null
}

async function readBoundedBody(
  request: Request,
): Promise<{bytes?: Uint8Array; status?: 400 | 413}> {
  if (request.body === null) return {bytes: new Uint8Array()}

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const {done, value} = await reader.read()
      if (done) break

      totalBytes += value.byteLength
      if (totalBytes > MAX_BODY_BYTES) {
        try {
          void reader.cancel().catch(() => undefined)
        } catch {
          // Returning the size error must not wait on a broken source.
        }
        return {status: 413}
      }
      chunks.push(value)
    }
  } catch {
    try {
      await reader.cancel()
    } catch {
      // The source may already be errored; the body is rejected either way.
    }
    return {status: 400}
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return {bytes}
}

function pruneProcessedEvents(now: number): void {
  for (const [eventId, expiresAt] of processedEventIds) {
    if (expiresAt > now) break
    processedEventIds.delete(eventId)
  }

  while (processedEventIds.size >= MAX_EVENT_IDS) {
    const oldestEventId = processedEventIds.keys().next().value as
      | string
      | undefined
    if (oldestEventId === undefined) break
    processedEventIds.delete(oldestEventId)
  }
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVALIDATION_SECRET
  if (!secret) {
    return json(500, {ok: false, error: 'Revalidation is not configured'})
  }

  const declaredLengthStatus = validateDeclaredLength(
    request.headers.get('content-length'),
  )
  if (declaredLengthStatus === 400) {
    return json(400, {ok: false, error: 'Invalid Content-Length'})
  }
  if (declaredLengthStatus === 413) {
    return json(413, {ok: false, error: 'Request body is too large'})
  }

  const bodyResult = await readBoundedBody(request)
  if (bodyResult.status !== undefined) {
    return json(bodyResult.status, {
      ok: false,
      error:
        bodyResult.status === 413
          ? 'Request body is too large'
          : 'Invalid request body',
    })
  }
  const rawBody = bodyResult.bytes as Uint8Array

  if (
    !hasValidSignature(
      rawBody,
      request.headers.get('x-tio2-signature'),
      secret,
    )
  ) {
    return json(401, {ok: false, error: 'Invalid signature'})
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(rawBody))
  } catch {
    return json(400, {ok: false, error: 'Invalid JSON body'})
  }

  const parsed = payloadSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return json(400, {ok: false, error: 'Invalid revalidation payload'})
  }

  const payload = parsed.data
  let currentSite
  try {
    currentSite = getCurrentSite()
  } catch {
    return json(500, {ok: false, error: 'Site is not configured'})
  }
  if (payload.siteIds[0] !== currentSite.id) {
    return json(400, {ok: false, error: 'Payload targets another site'})
  }

  const now = Date.now()
  const modifiedAt = Date.parse(payload.modified)
  if (Math.abs(now - modifiedAt) > MAX_EVENT_AGE_MS) {
    return json(400, {ok: false, error: 'Event timestamp is outside the allowed window'})
  }

  pruneProcessedEvents(now)
  if (processedEventIds.has(payload.eventId)) {
    return json(200, {
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [],
      revalidatedPaths: [],
    })
  }

  const productIdentityByPath = new Map(
    currentSite.id === 'tio2-a'
      ? getApprovedProductPagePaths(currentSite.id).flatMap((path) => {
          const identity = resolveProductPageIdentity(path)
          return identity ? [[path, identity] as const] : []
        })
      : [],
  )
  const unapprovedProductPath = payload.paths.find(
    (path) =>
      (path === '/products' || path.startsWith('/products/')) &&
      !productIdentityByPath.has(path),
  )
  if (unapprovedProductPath) {
    return json(400, {
      ok: false,
      error: 'Payload targets an unapproved Product path',
    })
  }

  const applicationIdByPath = new Map<string, string>(
    currentSite.id === 'tio2-a'
      ? SITE_A_APPLICATION_IDENTITIES.map(([id, , path]) => [path, id])
      : [],
  )
  const resourceIdByPath = new Map<string, string>(
    currentSite.id === 'tio2-a'
      ? SITE_A_RESOURCE_IDENTITIES.map(([id, , path]) => [path, id])
      : [],
  )
  const unapprovedEditorialPath = payload.paths.find(
    (path) =>
      (applicationIdByPath.has(path) || resourceIdByPath.has(path)) &&
      !isPublicRoute(currentSite.id, path),
  )
  if (unapprovedEditorialPath) {
    return json(400, {
      ok: false,
      error: 'Payload targets an unapproved Application or Resource path',
    })
  }

  const tags = new Set<string>()
  const preciseMalaysiaResourceEvent =
    currentSite.id === 'tio2-my' &&
    payload.paths.includes('/resources')
  for (const siteId of payload.siteIds) {
    if (!preciseMalaysiaResourceEvent) {
      tags.add(contentListTag(siteId))
      tags.add(siteTag(siteId))
      tags.add(sitemapTag(siteId))
    }
    for (const path of payload.paths) {
      tags.add(routeTag(siteId, path))
      if (path === '/') tags.add(homepageContentTag(siteId))
      if (siteId === 'tio2-my' && path === '/markets') {
        tags.add(marketHubContentTag(siteId))
      }
      if (siteId === 'tio2-my' && path === '/resources') {
        tags.add(resourceHubContentTag(siteId))
      }
      if (siteId === 'tio2-my' && path === '/about') {
        tags.add(aboutPageContentTag(siteId))
      }

      const productIdentity = productIdentityByPath.get(path)
      if (productIdentity) {
        tags.add(productListTag(siteId))
        if (productIdentity.level === 'hub') {
          tags.add(productsHubTag(siteId))
        } else if (productIdentity.level === 'family' && productIdentity.familySlug) {
          tags.add(productFamilyTag(siteId, productIdentity.familySlug))
        } else if (productIdentity.level === 'detail' && productIdentity.familySlug && productIdentity.productSlug) {
          tags.add(productDetailTag(siteId, productIdentity.familySlug, productIdentity.productSlug))
        }
        for (const entityId of payload.entityIds) {
          tags.add(entityTag(siteId, entityId))
        }
      }

      const applicationId = applicationIdByPath.get(path)
      if (applicationId) {
        tags.add(applicationTag(siteId, applicationId))
        tags.add(applicationListTag(siteId))
      }

      const resourceId = resourceIdByPath.get(path)
      if (resourceId) {
        tags.add(resourceTag(siteId, resourceId))
        tags.add(resourceListTag(siteId))
      }

      if (applicationId || resourceId) {
        for (const entityId of payload.entityIds) {
          tags.add(entityTag(siteId, entityId))
        }
      }
    }
  }

  const revalidatedTags = [...tags].sort()
  const revalidatedPaths = [...payload.paths].sort()

  for (const tag of revalidatedTags) revalidateTag(tag, 'max')
  for (const path of revalidatedPaths) revalidatePath(path)

  processedEventIds.set(payload.eventId, now + EVENT_TTL_MS)
  console.info('[tio2-revalidation]', {
    siteId: currentSite.id,
    contentId: payload.contentId,
    paths: revalidatedPaths,
  })

  return json(200, {
    ok: true,
    eventId: payload.eventId,
    revalidatedTags,
    revalidatedPaths,
  })
}
