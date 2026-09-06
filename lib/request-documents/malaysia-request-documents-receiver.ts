import {
  normalizeMalaysiaRequestDocumentsValues,
  validateMalaysiaRequestDocumentsValues,
  type MalaysiaRequestDocumentsErrors,
  type MalaysiaRequestDocumentsValues,
} from './malaysia-request-documents-validation'

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export type MalaysiaRequestDocumentsReceiverResult =
  | {readonly kind: 'receipt_confirmed'}
  | {readonly kind: 'validation_failed'; readonly errors: MalaysiaRequestDocumentsErrors}
  | {readonly kind: 'submission_unconfirmed'}
  | {readonly kind: 'unavailable'}

interface ReceiverOptions {
  readonly accessKey: string | null
  readonly requestToken: string
  readonly sourcePageId: string | null
  readonly marketId: string | null
  readonly fetcher?: Fetcher
  readonly timeoutMs?: number
}

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit'
const MAX_PROVIDER_PAYLOAD_BYTES = 16 * 1024
export const MALAYSIA_REQUEST_DOCUMENTS_SUBMISSION_TIMEOUT_MS = 12_000

export async function submitMalaysiaRequestDocuments(
  values: MalaysiaRequestDocumentsValues,
  options: ReceiverOptions,
): Promise<MalaysiaRequestDocumentsReceiverResult> {
  const validation = validateMalaysiaRequestDocumentsValues(values)
  if (!validation.valid) return {kind: 'validation_failed', errors: validation.errors}
  const accessKey = options.accessKey?.trim()
  if (!accessKey) return {kind: 'unavailable'}
  const fetcher = options.fetcher ?? fetch
  const timeoutMs = options.timeoutMs && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : MALAYSIA_REQUEST_DOCUMENTS_SUBMISSION_TIMEOUT_MS
  const controller = new AbortController()
  const normalizedValues = normalizeMalaysiaRequestDocumentsValues(values)
  const payload = {
    access_key: accessKey,
    subject: 'TiO2 Malaysia document request',
    from_name: 'TiO2 Malaysia Request Documents',
    email: normalizedValues.business_email,
    ...normalizedValues,
    site_scope: 'tio2-my', page_id: 'CONV-DOC', workflow: 'request_documents',
    request_token: options.requestToken,
    ...(options.sourcePageId ? {source_page_id: options.sourcePageId} : {}),
    ...(options.marketId ? {market_id: options.marketId} : {}),
  }
  const serializedPayload = JSON.stringify(payload)
  if (new TextEncoder().encode(serializedPayload).byteLength > MAX_PROVIDER_PAYLOAD_BYTES) {
    return {kind: 'submission_unconfirmed'}
  }
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort()
        reject(new DOMException('The Request Documents receiver timed out', 'AbortError'))
      }, timeoutMs)
    })
    const requestPromise = Promise.resolve().then(async (): Promise<MalaysiaRequestDocumentsReceiverResult> => {
      const response = await fetcher(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: {'content-type': 'application/json', accept: 'application/json'},
        body: serializedPayload,
        cache: 'no-store',
        referrerPolicy: 'origin',
        redirect: 'error',
        signal: controller.signal,
      })
      const mediaType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
      if (response.status !== 200 || mediaType !== 'application/json') {
        return {kind: 'submission_unconfirmed'}
      }
      const body = await response.json() as {success?: unknown}
      return body.success === true ? {kind: 'receipt_confirmed'} : {kind: 'submission_unconfirmed'}
    })
    return await Promise.race([requestPromise, timeoutPromise])
  } catch {
    return {kind: 'submission_unconfirmed'}
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}
