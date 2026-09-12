import {classifyWeb3FormsResponse} from '../../../lib/forms/web3forms-provider'
import type {Web3FormsWorkflow} from '../../../lib/forms/web3forms-browser'
import {PrivateInputError} from './private-input'

export function sanitizeLiveFailure(stage: string, error: unknown) {
  return {
    stage: ['configuration', 'public_form_fields', 'provider_response', 'thank_you_transition'].includes(stage) ? stage : 'unknown',
    category: error instanceof PrivateInputError && ['execution_failed', 'unavailable', 'not_editable', 'event_failed', 'not_applied', 'operation_failed'].includes(error.category) ? error.category : 'unknown',
    field: error instanceof PrivateInputError && error.field === 'documents.name' ? 'documents.name' : 'other',
  }
}

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
