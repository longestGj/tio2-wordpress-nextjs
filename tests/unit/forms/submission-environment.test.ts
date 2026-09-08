import {describe, expect, it} from 'vitest'

import {buildSubmissionEnvironment} from '@/lib/forms/submission-environment'

describe('form submission environment marker', () => {
  it('returns no payload fields and preserves the subject outside prerelease', () => {
    expect(buildSubmissionEnvironment(undefined, 'token-1', 'Subject')).toEqual({
      subject: 'Subject', fields: {},
    })
    expect(buildSubmissionEnvironment('production', 'token-1', 'Subject')).toEqual({
      subject: 'Subject', fields: {},
    })
  })

  it('marks local prerelease with the existing unique request token', () => {
    expect(buildSubmissionEnvironment('local-prerelease', 'token-1', 'Subject')).toEqual({
      subject: '[LOCAL PRERELEASE] Subject',
      fields: {environment: 'local-prerelease', test_run_id: 'token-1'},
    })
  })
})
