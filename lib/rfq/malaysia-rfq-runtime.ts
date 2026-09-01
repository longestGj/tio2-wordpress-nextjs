export interface MalaysiaRfqRuntimeDependencies {
  readonly receiverAccessKey: string | null
  readonly privacyPolicyHref: string | null
  readonly blockers: readonly (
    | 'receiver_configuration'
    | 'privacy_policy'
    | 'shared_consent_platform'
    | 'request_sample_route'
    | 'request_documents_route'
  )[]
}

function nonempty(value: string | undefined): string | null {
  return value && value.trim() === value && value ? value : null
}

function sameSiteCleanPath(value: string | undefined): string | null {
  const candidate = nonempty(value)
  if (!candidate) return null
  try {
    const url = new URL(candidate, 'https://tio2malaysia.com')
    if (
      url.origin !== 'https://tio2malaysia.com' || url.search || url.hash ||
      !url.pathname.startsWith('/') || url.pathname === '/contact/' || url.pathname === '/contact'
    ) return null
    return url.pathname
  } catch {
    return null
  }
}

export function resolveMalaysiaRfqRuntime(
  env: Readonly<Record<string, string | undefined>> = process.env,
): MalaysiaRfqRuntimeDependencies {
  const receiverAccessKey = nonempty(env.NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY)
  const privacyPolicyHref = sameSiteCleanPath(env.TIO2_MY_PRIVACY_POLICY_HREF)
  const blockers: MalaysiaRfqRuntimeDependencies['blockers'][number][] = []
  if (!receiverAccessKey) blockers.push('receiver_configuration')
  if (!privacyPolicyHref) blockers.push('privacy_policy')
  if (env.TIO2_MY_SHARED_CONSENT_READY !== 'true') blockers.push('shared_consent_platform')
  if (env.TIO2_MY_REQUEST_SAMPLE_READY !== 'true') blockers.push('request_sample_route')
  if (env.TIO2_MY_REQUEST_DOCUMENTS_READY !== 'true') blockers.push('request_documents_route')
  return {receiverAccessKey, privacyPolicyHref, blockers: Object.freeze(blockers)}
}
