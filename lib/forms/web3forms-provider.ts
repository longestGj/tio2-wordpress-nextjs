export type Web3FormsInvalidRequestCategory =
  | 'invalid_access_key'
  | 'domain_or_origin_restricted'
  | 'invalid_email'
  | 'malformed_request'
  | 'provider_policy'
  | 'unknown_invalid_request'

export type Web3FormsResponseCategory =
  | 'accepted' | 'rejected' | 'rate_limited' | 'unexpected'
  | Web3FormsInvalidRequestCategory

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : null
}

// Conservative synthetic recognition rules, not a claim of guaranteed provider
// wording or proof of the historical failure. Never search echoed body.data.
const errorPatterns: ReadonlyArray<readonly [Web3FormsInvalidRequestCategory, RegExp]> = [
  ['invalid_access_key', /^(?:invalid access[ _]key|(?:the )?access[ _]key (?:is )?(?:invalid|missing|required|not found))\b/iu],
  ['domain_or_origin_restricted', /^(?:the )?(?:domain|origin) (?:is )?(?:not allowed|not authorized|restricted|blocked)\b/iu],
  ['invalid_email', /^(?:invalid email(?: address)?|(?:the )?email(?: address)? (?:is )?(?:invalid|missing|required))\b/iu],
  ['malformed_request', /^(?:malformed (?:request|json)|invalid (?:request (?:body|payload)|json))\b/iu],
  ['provider_policy', /^submission (?:blocked|rejected) (?:by|due to) (?:provider )?policy\b/iu],
]

function invalidRequestCategory(body: unknown): Web3FormsInvalidRequestCategory {
  const response = record(body)
  if (!response || response.success === true) return 'unknown_invalid_request'
  // Official API reference documents body.message; browser examples also use
  // top-level message. Only these two message slots are inspected, transiently.
  const messages = [response.message, record(response.body)?.message]
  const categories = new Set<Web3FormsInvalidRequestCategory>()
  for (const message of messages) {
    if (typeof message !== 'string') continue
    for (const [category, pattern] of errorPatterns) {
      if (pattern.test(message.trim())) categories.add(category)
    }
  }
  return categories.size === 1 ? [...categories][0]! : 'unknown_invalid_request'
}

export function classifyWeb3FormsResponse(status: number, body: unknown): Web3FormsResponseCategory {
  if (status === 400 || status === 422) return invalidRequestCategory(body)
  if (status === 429) return 'rate_limited'
  if (status === 200) {
    const success = record(body)?.success
    if (success === true) return 'accepted'
    if (success === false) return 'rejected'
  }
  return 'unexpected'
}
