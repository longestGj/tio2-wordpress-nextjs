import {buildSubmissionEnvironment, type SubmissionEnvironment} from '@/lib/forms/submission-environment'
import {submitWeb3FormsBrowser, type Web3FormsBrowserResult} from '@/lib/forms/web3forms-browser'
import {
  normalizeMalaysiaContactValues,
  validateMalaysiaContactValues,
  type MalaysiaContactErrors,
  type MalaysiaContactValues,
} from './malaysia-contact-validation'

export type MalaysiaContactReceiverResult = Web3FormsBrowserResult | {
  readonly kind: 'validation_failed'
  readonly errors: MalaysiaContactErrors
}

interface ReceiverOptions {
  readonly accessKey: string | null
  readonly requestToken: string
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
  readonly environment?: SubmissionEnvironment
}

const MAX_PROVIDER_PAYLOAD_BYTES = 16 * 1024
export const MALAYSIA_CONTACT_SUBMISSION_TIMEOUT_MS = 12_000

export function submitMalaysiaContact(
  values: MalaysiaContactValues,
  options: ReceiverOptions,
): Promise<MalaysiaContactReceiverResult> {
  const errors = validateMalaysiaContactValues(values)
  if (Object.keys(errors).length) return Promise.resolve({kind: 'validation_failed', errors})
  if (!options.accessKey) {
    return submitWeb3FormsBrowser({
      workflow: 'contact', accessKey: null, requestToken: options.requestToken,
      timeoutMs: options.timeoutMs ?? MALAYSIA_CONTACT_SUBMISSION_TIMEOUT_MS, payload: {},
    }, {fetcher: options.fetcher})
  }

  const normalized = normalizeMalaysiaContactValues(values)
  const baseSubject = options.environment === 'local-prerelease'
    ? `TiO2 Malaysia general inquiry — TEST ${options.requestToken}`
    : 'TiO2 Malaysia general inquiry'
  const environment = buildSubmissionEnvironment(
    options.environment ?? undefined,
    options.requestToken,
    baseSubject,
  )
  const payload = {
    subject: environment.subject,
    from_name: 'TiO2 Malaysia Contact',
    email: normalized.business_email,
    full_name: normalized.full_name,
    company: normalized.company,
    business_email: normalized.business_email,
    country_region: normalized.country_region,
    inquiry_subject: normalized.subject,
    message: normalized.message,
    site_scope: 'tio2-my',
    page_id: 'CONTACT-001',
    workflow_type: 'contact',
    locale: 'en',
    request_token: options.requestToken,
    ...environment.fields,
  }
  if (new TextEncoder().encode(JSON.stringify({...payload, access_key: options.accessKey})).byteLength > MAX_PROVIDER_PAYLOAD_BYTES) {
    return Promise.resolve({
      kind: 'submission_unconfirmed',
      diagnostic: {
        workflow: 'contact', requestToken: options.requestToken, httpStatus: null, mediaType: null,
        outcome: 'submission_unconfirmed', providerCategory: 'unexpected',
      },
    })
  }
  return submitWeb3FormsBrowser({
    workflow: 'contact', accessKey: options.accessKey, requestToken: options.requestToken,
    timeoutMs: options.timeoutMs ?? MALAYSIA_CONTACT_SUBMISSION_TIMEOUT_MS, payload,
  }, {fetcher: options.fetcher})
}
