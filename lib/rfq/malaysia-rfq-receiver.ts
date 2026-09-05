import type {MalaysiaRfqValues} from './malaysia-rfq-validation'

export interface MalaysiaRfqSubmission extends MalaysiaRfqValues {
  readonly source_page_id: string | null
  readonly interest?: string | null
}

export type MalaysiaRfqReceiverResult =
  | {readonly kind: 'receipt_confirmed'}
  | {readonly kind: 'submission_unconfirmed'}
  | {readonly kind: 'service_unavailable'}

interface SubmitOptions {
  readonly accessKey: string | null
  readonly fetcher?: typeof fetch
  readonly endpoint?: string
  readonly timeoutMs?: number
}

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit'
export const MALAYSIA_RFQ_SUBMISSION_TIMEOUT_MS = 10_000

export async function submitMalaysiaRfq(
  submission: MalaysiaRfqSubmission,
  options: SubmitOptions,
): Promise<MalaysiaRfqReceiverResult> {
  if (!options.accessKey?.trim()) return {kind: 'service_unavailable'}
  const fetcher = options.fetcher ?? fetch
  const endpoint = options.endpoint ?? WEB3FORMS_ENDPOINT
  const timeoutMs = options.timeoutMs && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : MALAYSIA_RFQ_SUBMISSION_TIMEOUT_MS
  const controller = new AbortController()
  const requestToken = globalThis.crypto?.randomUUID?.() ?? `rfq-${Date.now()}`
  const payload = {
    access_key: options.accessKey,
    subject: 'TiO2 Malaysia quotation request',
    from_name: 'TiO2 Malaysia RFQ',
    email: submission.business_email,
    site_scope: 'tio2-my',
    page_id: 'CONV-RFQ',
    workflow_type: 'rfq',
    locale: 'en',
    request_token: requestToken,
    grade_id: submission.grade_id,
    application_id: submission.application_id,
    quantity_mt: submission.quantity_mt,
    quantity_unit: 'MT',
    destination_country: submission.destination_country,
    destination_port_city: submission.destination_port_city,
    company_name: submission.company_name,
    contact_name: submission.contact_name,
    business_email: submission.business_email,
    phone_whatsapp: submission.phone_whatsapp,
    website: submission.website,
    additional_requirements: submission.additional_requirements,
    ...(submission.source_page_id ? {source_page_id: submission.source_page_id} : {}),
    ...(submission.interest === 'alternative-origin-sourcing'
      ? {interest: 'alternative-origin-sourcing'}
      : {}),
  }

  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort()
        reject(new DOMException('The RFQ receiver timed out', 'AbortError'))
      }, timeoutMs)
    })
    const requestPromise = Promise.resolve().then(async (): Promise<MalaysiaRfqReceiverResult> => {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: {'content-type': 'application/json', accept: 'application/json'},
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (response.status !== 200 || !response.headers.get('content-type')?.includes('application/json')) {
        return {kind: 'submission_unconfirmed'}
      }
      const body = await response.json() as {readonly success?: unknown}
      return body.success === true ? {kind: 'receipt_confirmed'} : {kind: 'submission_unconfirmed'}
    })
    return await Promise.race([requestPromise, timeoutPromise])
  } catch {
    return {kind: 'submission_unconfirmed'}
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}
