import {readMalaysiaConsentChoice} from '@/lib/consent/malaysia-consent'

export const MALAYSIA_THANK_YOU_MARKER_TTL_MS = 10 * 60 * 1_000
const MARKER_KEY = 'tio2-my:thank-you:receipt:v1'

export type MalaysiaThankYouRequest = 'quote' | 'documents' | 'sample'
export type MalaysiaThankYouState = MalaysiaThankYouRequest | 'direct'

interface ReceiptMarker {
  readonly version: 1
  readonly request: MalaysiaThankYouRequest
  readonly succeededAt: number
  readonly flowId: string
}

interface MarkerOptions {
  readonly storage?: Storage
  readonly now?: number
  readonly flowId?: string
}

const requests = new Set<MalaysiaThankYouRequest>(['quote', 'documents', 'sample'])

function isRequest(value: unknown): value is MalaysiaThankYouRequest {
  return typeof value === 'string' && requests.has(value as MalaysiaThankYouRequest)
}

function getStorage(storage?: Storage): Storage {
  if (storage) return storage
  if (typeof window === 'undefined') throw new Error('Thank-you receipt storage is unavailable')
  return window.sessionStorage
}

function createFlowId(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error('A secure flow identifier is required')
  return globalThis.crypto.randomUUID()
}

function parseMarker(raw: string | null): ReceiptMarker | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    const keys = Object.keys(value).sort()
    if (keys.join(',') !== 'flowId,request,succeededAt,version') return null
    if (value.version !== 1 || !isRequest(value.request)) return null
    if (!Number.isFinite(value.succeededAt) || typeof value.flowId !== 'string' || !value.flowId) return null
    return value as unknown as ReceiptMarker
  } catch {
    return null
  }
}

export function recordMalaysiaThankYouReceipt(request: MalaysiaThankYouRequest, options: MarkerOptions = {}): void {
  const marker: ReceiptMarker = {
    version: 1,
    request,
    succeededAt: options.now ?? Date.now(),
    flowId: options.flowId ?? createFlowId(),
  }
  getStorage(options.storage).setItem(MARKER_KEY, JSON.stringify(marker))
}

export function resolveMalaysiaThankYouRequest(
  search: string,
  options: Omit<MarkerOptions, 'flowId'> = {},
): MalaysiaThankYouState {
  const params = new URLSearchParams(search)
  if (params.has('type')) return 'direct'
  const candidates = params.getAll('request')
  if (candidates.length !== 1 || !isRequest(candidates[0])) return 'direct'

  let storage: Storage
  let marker: ReceiptMarker | null
  try {
    storage = getStorage(options.storage)
    marker = parseMarker(storage.getItem(MARKER_KEY))
  } catch {
    return 'direct'
  }
  if (!marker) return 'direct'
  const now = options.now ?? Date.now()
  if (marker.succeededAt > now || now - marker.succeededAt > MALAYSIA_THANK_YOU_MARKER_TTL_MS) {
    storage.removeItem(MARKER_KEY)
    return 'direct'
  }
  return marker.request === candidates[0] ? marker.request : 'direct'
}

export function emitMalaysiaSourceSuccess(request: MalaysiaThankYouRequest): void {
  if (typeof window === 'undefined') return
  const current = window.__TIO2_SHARED_CONSENT__
  if (current ? current.siteScope !== 'tio2-my' || current.analytics !== 'granted' : readMalaysiaConsentChoice() !== 'analytics_accepted') return
  const events = {quote: 'rfq_receipt_confirmed', documents: 'documents_receipt_confirmed', sample: 'sample_receipt_confirmed'} as const
  window.dataLayer ??= []
  window.dataLayer.push({event: events[request], ad_personalization: 'denied'})
}

export function navigateToMalaysiaThankYou(request: MalaysiaThankYouRequest): void {
  recordMalaysiaThankYouReceipt(request)
  emitMalaysiaSourceSuccess(request)
  // A document navigation keeps the receipt transition independent of React render/cache state.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/thank-you/?request=${request}`)
}
