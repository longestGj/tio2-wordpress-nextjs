import {createHmac, timingSafeEqual} from 'node:crypto'

export const MALAYSIA_RFQ_ATTRIBUTION_COOKIE = 'my_rfq_context'
export const MALAYSIA_RFQ_ATTRIBUTION_MAX_AGE_SECONDS = 600

function secret(value: string | undefined): string | null {
  return value && value.trim() === value && value.length >= 32 ? value : null
}

export function createMalaysiaRfqAttributionToken(value: string | undefined): string | null {
  const key = secret(value)
  return key ? createHmac('sha256', key).update('APP-000').digest('base64url') : null
}

export function isMalaysiaRfqAttributionToken(candidate: string | undefined, value: string | undefined): boolean {
  const expected = createMalaysiaRfqAttributionToken(value)
  if (!candidate || !expected || candidate.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))
}

export function isMalaysiaApplicationHubReferer(requestUrl: string, referer: string | null): boolean {
  if (!referer) return false
  try {
    const request = new URL(requestUrl)
    const source = new URL(referer)
    return source.origin === request.origin && source.pathname.replace(/\/$/u, '') === '/applications'
  } catch {
    return false
  }
}
