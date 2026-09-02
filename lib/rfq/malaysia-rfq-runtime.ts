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

export function resolveMalaysiaRfqRuntime(
  env: Readonly<Record<string, string | undefined>> = process.env,
): MalaysiaRfqRuntimeDependencies {
  const receiverAccessKey = nonempty(env.NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY)
  const privacyPolicyHref = '/privacy-policy/'
  const blockers: MalaysiaRfqRuntimeDependencies['blockers'][number][] = []
  if (!receiverAccessKey) blockers.push('receiver_configuration')
  if (env.TIO2_MY_REQUEST_SAMPLE_READY !== 'true') blockers.push('request_sample_route')
  if (env.TIO2_MY_REQUEST_DOCUMENTS_READY !== 'true') blockers.push('request_documents_route')
  return {receiverAccessKey, privacyPolicyHref, blockers: Object.freeze(blockers)}
}
