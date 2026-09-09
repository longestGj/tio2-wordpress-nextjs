import {describe, expect, it} from 'vitest'

import {resolveMalaysiaRfqRuntime} from '@/lib/rfq/malaysia-rfq-runtime'

describe('CONV-RFQ external readiness consumption', () => {
  it('fails closed without inventing routes or receiver configuration', () => {
    expect(resolveMalaysiaRfqRuntime({})).toEqual({
      receiverAccessKey: null,
      privacyPolicyHref: '/privacy-policy/',
      blockers: [
        'receiver_configuration', 'request_sample_route', 'request_documents_route',
      ],
    })
  })

  it.each(['', ' ', 'replace-with-access-key', 'x'.repeat(52), '01234567-89ab-cdef-0123-456789abcdef '])('blocks malformed receiver configuration %#', key => {
    const runtime = resolveMalaysiaRfqRuntime({NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY: key})
    expect(runtime.receiverAccessKey).toBeNull()
    expect(runtime.blockers).toContain('receiver_configuration')
  })

  it('accepts only a clean same-site Privacy route and explicit readiness', () => {
    expect(resolveMalaysiaRfqRuntime({
      NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY: '01234567-89ab-cdef-0123-456789abcdef',
      TIO2_MY_REQUEST_SAMPLE_READY: 'true',
      TIO2_MY_REQUEST_DOCUMENTS_READY: 'true',
    })).toEqual({
      receiverAccessKey: '01234567-89ab-cdef-0123-456789abcdef',
      privacyPolicyHref: '/privacy-policy/',
      blockers: [],
    })
    expect(resolveMalaysiaRfqRuntime({TIO2_MY_PRIVACY_POLICY_HREF: 'https://tiovar.com/privacy/'}).privacyPolicyHref).toBe('/privacy-policy/')
  })
})
