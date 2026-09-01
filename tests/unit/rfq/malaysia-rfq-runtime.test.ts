import {describe, expect, it} from 'vitest'

import {resolveMalaysiaRfqRuntime} from '@/lib/rfq/malaysia-rfq-runtime'

describe('CONV-RFQ external readiness consumption', () => {
  it('fails closed without inventing routes or receiver configuration', () => {
    expect(resolveMalaysiaRfqRuntime({})).toEqual({
      receiverAccessKey: null,
      privacyPolicyHref: null,
      blockers: [
        'receiver_configuration', 'privacy_policy', 'shared_consent_platform',
        'request_sample_route', 'request_documents_route',
      ],
    })
  })

  it('accepts only a clean same-site Privacy route and explicit readiness', () => {
    expect(resolveMalaysiaRfqRuntime({
      NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY: 'test-access-key',
      TIO2_MY_PRIVACY_POLICY_HREF: 'https://tio2malaysia.com/legal/privacy-policy/',
      TIO2_MY_SHARED_CONSENT_READY: 'true',
      TIO2_MY_REQUEST_SAMPLE_READY: 'true',
      TIO2_MY_REQUEST_DOCUMENTS_READY: 'true',
    })).toEqual({
      receiverAccessKey: 'test-access-key',
      privacyPolicyHref: '/legal/privacy-policy/',
      blockers: [],
    })
    expect(resolveMalaysiaRfqRuntime({TIO2_MY_PRIVACY_POLICY_HREF: '/contact/'}).privacyPolicyHref).toBeNull()
    expect(resolveMalaysiaRfqRuntime({TIO2_MY_PRIVACY_POLICY_HREF: 'https://tiovar.com/privacy/'}).privacyPolicyHref).toBeNull()
  })
})
