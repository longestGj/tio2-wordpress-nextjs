import type {Web3FormsWorkflow} from '../../../lib/forms/web3forms-browser'

export function buyerEmailTestValue(runId: string, workflow: Web3FormsWorkflow): string {
  if (!/^[a-zA-Z0-9-]{1,100}$/u.test(runId)) throw new Error('Invalid run identity')
  return `local-prerelease-${runId}-${workflow}@example.com`
}

export function providerAttempt(workflow: Web3FormsWorkflow, payload: unknown, httpStatus: number | null, body: unknown) {
  const requestToken = typeof payload === 'object' && payload !== null && 'request_token' in payload ? payload.request_token : null
  if (typeof requestToken !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/iu.test(requestToken)) throw new Error('Invalid request token')
  const success = typeof body === 'object' && body !== null && 'success' in body ? body.success : undefined
  const providerCategory = httpStatus === null ? 'pending' : httpStatus === 200 && success === true ? 'accepted'
    : httpStatus === 429 ? 'rate_limited' : httpStatus === 400 || httpStatus === 422 ? 'invalid_request'
      : httpStatus === 200 && success === false ? 'rejected' : 'unexpected'
  return {
    workflow, pageId: {rfq: 'CONV-RFQ', sample: 'CONV-SAMPLE', documents: 'CONV-DOC'}[workflow],
    requestToken, httpStatus, providerCategory, thankYouRequest: null as string | null, timestamp: new Date().toISOString(),
  }
}
