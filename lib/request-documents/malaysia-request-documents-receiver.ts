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
  readonly endpoint: string | null
  readonly token: string | null
  readonly requestToken: string
  readonly sourcePageId: string | null
  readonly marketId: string | null
  readonly fetcher?: Fetcher
}

export async function submitMalaysiaRequestDocuments(
  values: MalaysiaRequestDocumentsValues,
  options: ReceiverOptions,
): Promise<MalaysiaRequestDocumentsReceiverResult> {
  const validation = validateMalaysiaRequestDocumentsValues(values)
  if (!validation.valid) return {kind: 'validation_failed', errors: validation.errors}
  if (!options.endpoint || !options.token) return {kind: 'unavailable'}
  const fetcher = options.fetcher ?? fetch
  try {
    const response = await fetcher(options.endpoint, {
      method: 'POST',
      headers: {'content-type': 'application/json', authorization: `Bearer ${options.token}`},
      body: JSON.stringify({
        ...normalizeMalaysiaRequestDocumentsValues(values),
        site_scope: 'tio2-my', page_id: 'CONV-DOC', workflow: 'request_documents',
        request_token: options.requestToken,
        ...(options.sourcePageId ? {source_page_id: options.sourcePageId} : {}),
        ...(options.marketId ? {market_id: options.marketId} : {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) return {kind: 'submission_unconfirmed'}
    const body = await response.json() as {receiptConfirmed?: unknown}
    return body.receiptConfirmed === true ? {kind: 'receipt_confirmed'} : {kind: 'submission_unconfirmed'}
  } catch {
    return {kind: 'submission_unconfirmed'}
  }
}
