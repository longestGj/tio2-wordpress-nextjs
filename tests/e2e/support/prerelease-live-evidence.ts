import {classifyWeb3FormsResponse} from '../../../lib/forms/web3forms-provider'
import type {Web3FormsWorkflow} from '../../../lib/forms/web3forms-browser'

export function buyerEmailTestValue(runId: string, workflow: Web3FormsWorkflow): string {
  if (!/^[a-zA-Z0-9-]{1,100}$/u.test(runId)) throw new Error('Invalid run identity')
  return `local-prerelease-${runId}-${workflow}@example.com`
}

export function providerAttempt(workflow: Web3FormsWorkflow, payload: unknown, httpStatus: number | null, body: unknown) {
  const requestToken = typeof payload === 'object' && payload !== null && 'request_token' in payload ? payload.request_token : null
  if (typeof requestToken !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/iu.test(requestToken)) throw new Error('Invalid request token')
  const providerCategory = httpStatus === null ? 'pending' : classifyWeb3FormsResponse(httpStatus, body)
  return {
    workflow, pageId: {rfq: 'CONV-RFQ', sample: 'CONV-SAMPLE', documents: 'CONV-DOC', contact: 'CONTACT-001'}[workflow],
    requestToken, httpStatus, providerCategory, thankYouRequest: null as string | null, timestamp: new Date().toISOString(),
  }
}
