import {createHmac, timingSafeEqual} from 'node:crypto'
import {revalidatePath, revalidateTag} from 'next/cache'
import {z} from 'zod'

import {
  contentTag,
  entityTag,
  isValidPublicPath,
  routeTag,
  siteTag,
} from '@/lib/wordpress/cache-tags'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 64 * 1024
const MAX_EVENT_AGE_MS = 5 * 60 * 1000
const EVENT_TTL_MS = 10 * 60 * 1000
const MAX_EVENT_IDS = 1024
const processedEventIds = new Map<string, number>()

const uniqueArray = <T>(values: readonly T[]): boolean =>
  new Set(values).size === values.length

const payloadSchema = z
  .object({
    eventId: z.uuid(),
    siteIds: z
      .array(z.enum(['tio2-a', 'tio2-b']))
      .min(1)
      .max(2)
      .refine(uniqueArray),
    contentId: z.number().int().positive().safe(),
    paths: z
      .array(z.string().refine(isValidPublicPath))
      .max(256)
      .refine(uniqueArray),
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

  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null && Number(declaredLength) > MAX_BODY_BYTES) {
    return json(413, {ok: false, error: 'Request body is too large'})
  }

  const rawBody = new Uint8Array(await request.arrayBuffer())
  if (rawBody.byteLength > MAX_BODY_BYTES) {
    return json(413, {ok: false, error: 'Request body is too large'})
  }

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

  const tags = new Set<string>()
  for (const siteId of payload.siteIds) {
    tags.add(siteTag(siteId))
    tags.add(contentTag(siteId, payload.contentId))
    for (const path of payload.paths) tags.add(routeTag(siteId, path))
    for (const entityId of payload.entityIds) {
      tags.add(entityTag(siteId, entityId))
    }
  }

  const revalidatedTags = [...tags].sort()
  const revalidatedPaths = [...payload.paths].sort()

  for (const tag of revalidatedTags) revalidateTag(tag, 'max')
  for (const path of revalidatedPaths) revalidatePath(path)

  processedEventIds.set(payload.eventId, now + EVENT_TTL_MS)

  return json(200, {
    ok: true,
    eventId: payload.eventId,
    revalidatedTags,
    revalidatedPaths,
  })
}
