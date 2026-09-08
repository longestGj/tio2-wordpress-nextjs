import {createHmac, timingSafeEqual} from 'node:crypto'

export const MALAYSIA_RFQ_ATTRIBUTION_COOKIE = 'rfq_context'
export const MALAYSIA_RFQ_ATTRIBUTION_MAX_AGE_SECONDS = 600

const sourceByPath = new Map<string, string>([
  ['/', 'HOME-001'],
  ['/markets', 'MARKET-000'],
  ['/markets/european-union', 'MARKET-EU-001'], ['/markets/united-kingdom', 'MARKET-UK-001'],
  ['/markets/india', 'MARKET-IN-001'], ['/markets/netherlands', 'MARKET-EU-NL'],
  ['/markets/belgium', 'MARKET-EU-BE'], ['/markets/poland', 'MARKET-EU-PL'],
  ['/markets/spain', 'MARKET-EU-ES'], ['/markets/germany', 'MARKET-EU-DE'],
  ['/markets/italy', 'MARKET-EU-IT'], ['/markets/brazil', 'MARKET-BR-EN'],
  ['/pt-br/markets/brazil', 'MARKET-BR-PT'],
  ['/products', 'PRODUCT-000'],
  ['/products/chloride-process-titanium-dioxide', 'PRODUCT-PROC-CL'],
  ['/products/sulfate-process-titanium-dioxide', 'PRODUCT-PROC-SU'],
  ['/applications', 'APP-000'],
  ['/applications/titanium-dioxide-for-coatings', 'APP-COAT'],
  ['/applications/titanium-dioxide-for-plastics', 'APP-PLAS'],
  ['/applications/titanium-dioxide-for-masterbatch', 'APP-MB'],
  ['/applications/titanium-dioxide-for-printing-inks', 'APP-INK'],
  ['/applications/titanium-dioxide-for-paper', 'APP-PAPER'],
  ['/documents', 'DOC-000'], ['/documents/tds-sds-coa', 'DOC-TDS'],
  ['/documents/reach', 'DOC-REACH'], ['/documents/certificate-of-origin', 'DOC-COO'],
  ['/resources', 'RES-000'], ['/resources/non-china-titanium-dioxide', 'RES-ORIGIN'],
  ['/resources/chloride-vs-sulfate-titanium-dioxide', 'RES-PROC'],
  ['/resources/ti-pure-r-706-alternative', 'RES-R706'],
  ['/resources/chemours-titanium-dioxide-alternatives', 'RES-CHEMOURS'],
  ['/resources/eu-titanium-dioxide-anti-dumping-duty', 'RES-TRADE-EU'],
  ['/resources/uk-titanium-dioxide-anti-dumping-investigation', 'RES-TRADE-UK'],
  ['/resources/india-titanium-dioxide-anti-dumping-duty', 'RES-TRADE-IN'],
  ['/resources/brazil-titanium-dioxide-anti-dumping-duty', 'RES-TRADE-BR'],
  ['/about', 'ABOUT-001'], ['/request-a-quote', 'CONV-RFQ'],
  ['/request-sample', 'CONV-SAMPLE'], ['/request-documents', 'CONV-DOC'],
])
const gradeSources = new Map([
  'm-350', 'm-510', 'm-896', 'm-996', 'm-2196', 'm-895', 'm-200', 'm-108',
  'm-210', 'm-340', 'm-886', 'm-52', 'm-2377', 'cr-901',
].map((slug) => [`/products/${slug}`, `GRADE-${slug.replace('-', '').toUpperCase()}`]))
const sourcePageIds = Object.freeze([...new Set([...sourceByPath.values(), ...gradeSources.values()])])

function secret(value: string | undefined): string | null {
  return value && value.trim() === value && value.length >= 32 ? value : null
}

export function createMalaysiaRfqAttributionToken(value: string | undefined, sourcePageId = 'APP-000'): string | null {
  const key = secret(value)
  return key && sourcePageIds.includes(sourcePageId)
    ? createHmac('sha256', key).update(sourcePageId).digest('base64url')
    : null
}

export function resolveMalaysiaRfqAttributionToken(candidate: string | undefined, value: string | undefined): string | null {
  if (!candidate) return null
  for (const sourcePageId of sourcePageIds) {
    const expected = createMalaysiaRfqAttributionToken(value, sourcePageId)
    if (expected && candidate.length === expected.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))) {
      return sourcePageId
    }
  }
  return null
}

export function isMalaysiaRfqAttributionToken(candidate: string | undefined, value: string | undefined): boolean {
  return resolveMalaysiaRfqAttributionToken(candidate, value) !== null
}

export function resolveMalaysiaRfqRefererSource(requestUrl: string, referer: string | null): string | null {
  if (!referer) return null
  try {
    const request = new URL(requestUrl)
    const source = new URL(referer)
    if (source.origin !== request.origin) return null
    const path = source.pathname === '/' ? '/' : source.pathname.replace(/\/$/u, '')
    return sourceByPath.get(path) ?? gradeSources.get(path) ?? null
  } catch {
    return null
  }
}

export function isMalaysiaApplicationHubReferer(requestUrl: string, referer: string | null): boolean {
  return resolveMalaysiaRfqRefererSource(requestUrl, referer) === 'APP-000'
}
