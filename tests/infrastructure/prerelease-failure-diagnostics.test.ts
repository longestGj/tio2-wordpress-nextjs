import {expect, it} from 'vitest'
import {sanitizeLiveFailure} from '../e2e/support/prerelease-live-evidence'
import {PrivateInputError} from '../e2e/support/private-input'

it('retains fixed input status and public field without entered values', () => {
  expect(sanitizeLiveFailure('public_form_fields', new PrivateInputError('not_applied', '#request-documents-full_name')))
    .toEqual({stage: 'public_form_fields', category: 'not_applied', field: 'documents.name'})
})
it('does not persist arbitrary error, selector, or stage strings', () => {
  const secret = 'PRIVATE_SENTINEL'
  const failure = sanitizeLiveFailure(secret, new Error(secret))
  expect(failure).toEqual({stage: 'unknown', category: 'unknown', field: 'other'})
  expect(JSON.stringify(sanitizeLiveFailure('public_form_fields', new PrivateInputError(secret, secret)))).not.toContain(secret)
})
