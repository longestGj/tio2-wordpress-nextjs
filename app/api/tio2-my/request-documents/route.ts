import {submitMalaysiaRequestDocuments} from '@/lib/request-documents/malaysia-request-documents-receiver'
import {
  normalizeMalaysiaRequestDocumentsMarketId,
  normalizeMalaysiaRequestDocumentsSourcePageId,
} from '@/lib/request-documents/malaysia-request-documents-prefill'
import type {MalaysiaRequestDocumentsValues} from '@/lib/request-documents/malaysia-request-documents-validation'
import {getCurrentSite} from '@/lib/sites/current-site'

export const runtime = 'nodejs'

type UnknownRecord = Record<string, unknown>
const MAX_BODY_BYTES = 16 * 1024
const text = (value: unknown): string => typeof value === 'string' ? value : ''
const requestToken = (value: unknown): string | null => (
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
    ? value : null
)

function json(status: number, body: UnknownRecord): Response {
  return Response.json(body, {status, headers: {'cache-control': 'no-store'}})
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null && (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > MAX_BODY_BYTES)) {
    throw new RangeError('body size')
  }
  if (request.body === null) throw new SyntaxError('empty body')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const {done, value} = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => undefined)
        throw new RangeError('body size')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes))
}

export async function POST(request: Request): Promise<Response> {
  let site
  try { site = getCurrentSite() } catch { return json(404, {ok: false, kind: 'not_found'}) }
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') return json(404, {ok: false, kind: 'not_found'})
  const requestOrigin = new URL(request.url).origin
  if (request.headers.get('origin') !== requestOrigin) return json(403, {ok: false, kind: 'invalid_origin'})
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get('content-type') ?? '')) {
    return json(415, {ok: false, kind: 'invalid_content_type'})
  }
  let input: unknown
  try { input = await readBoundedJson(request) } catch (error) {
    return json(error instanceof RangeError ? 413 : 400, {ok: false, kind: error instanceof RangeError ? 'request_too_large' : 'invalid_request'})
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json(400, {ok: false, kind: 'invalid_request'})
  const body = input as UnknownRecord
  const token = requestToken(body.request_token)
  if (!token) return json(400, {ok: false, kind: 'invalid_request'})
  const values: MalaysiaRequestDocumentsValues = {
    full_name: text(body.full_name), company: text(body.company), business_email: text(body.business_email),
    country_region: text(body.country_region), product_grade: text(body.product_grade),
    document_types: Array.isArray(body.document_types) ? body.document_types.filter((item): item is string => typeof item === 'string') : [],
    application_industry: text(body.application_industry), additional_requirements: text(body.additional_requirements),
  }
  const result = await submitMalaysiaRequestDocuments(values, {
    endpoint: process.env.TIO2_MY_REQUEST_DOCUMENTS_RECEIVER_URL ?? null,
    token: process.env.TIO2_MY_REQUEST_DOCUMENTS_RECEIVER_TOKEN ?? null,
    requestToken: token,
    sourcePageId: normalizeMalaysiaRequestDocumentsSourcePageId(body.source_page_id, {
      productGrade: values.product_grade,
      applicationIndustry: values.application_industry,
    }),
    marketId: normalizeMalaysiaRequestDocumentsMarketId(body.market_id),
  })
  if (result.kind === 'receipt_confirmed') return json(200, {ok: true, kind: result.kind})
  if (result.kind === 'validation_failed') return json(400, {ok: false, kind: result.kind, errors: result.errors})
  if (result.kind === 'unavailable') return json(503, {ok: false, kind: result.kind})
  return json(502, {ok: false, kind: result.kind})
}
