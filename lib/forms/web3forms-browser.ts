import {classifyWeb3FormsResponse, type Web3FormsResponseCategory} from './web3forms-provider'
import {isWeb3FormsAccessKey} from './web3forms-config'

export type Web3FormsWorkflow = 'rfq' | 'sample' | 'documents' | 'contact'
export type Web3FormsOutcome = 'provider_accepted' | 'provider_rejected' | 'submission_unconfirmed' | 'unavailable'
export type Web3FormsProviderCategory = Web3FormsResponseCategory | 'network' | 'timeout' | 'aborted'

export interface Web3FormsDiagnostic {
  readonly workflow: Web3FormsWorkflow
  readonly requestToken: string
  readonly httpStatus: number | null
  readonly mediaType: string | null
  readonly outcome: Web3FormsOutcome
  readonly providerCategory: Web3FormsProviderCategory
}

export interface Web3FormsBrowserInput {
  readonly workflow: Web3FormsWorkflow
  readonly accessKey: string | null
  readonly requestToken: string
  readonly payload: Readonly<Record<string, unknown>>
  readonly timeoutMs: number
  readonly signal?: AbortSignal
}

export interface Web3FormsBrowserDependencies {
  readonly fetcher?: typeof fetch
  readonly endpoint?: string
}

export type Web3FormsBrowserResult = Readonly<{
  kind: Web3FormsOutcome
  diagnostic: Web3FormsDiagnostic
}>

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit'

type TerminalReason = 'timeout' | 'aborted'

function result(
  input: Web3FormsBrowserInput,
  outcome: Web3FormsOutcome,
  providerCategory: Web3FormsProviderCategory,
  httpStatus: number | null = null,
  mediaType: string | null = null,
): Web3FormsBrowserResult {
  return {
    kind: outcome,
    diagnostic: {
      workflow: input.workflow,
      requestToken: input.requestToken,
      httpStatus,
      mediaType,
      outcome,
      providerCategory,
    },
  }
}

function responseMediaType(response: Response): string | null {
  const contentType = response.headers.get('content-type')
  if (!contentType) return null
  return contentType.split(';', 1)[0]?.trim().toLowerCase() || null
}

function canContainJson(mediaType: string | null): boolean {
  return mediaType === 'application/json' || mediaType?.endsWith('+json') === true
}

export function createWeb3FormsRequestToken(): string {
  return crypto.randomUUID()
}

export async function submitWeb3FormsBrowser(
  input: Web3FormsBrowserInput,
  deps: Web3FormsBrowserDependencies = {},
): Promise<Web3FormsBrowserResult> {
  if (!isWeb3FormsAccessKey(input.accessKey)) return result(input, 'unavailable', 'unexpected')
  if (input.signal?.aborted) return result(input, 'submission_unconfirmed', 'aborted')

  const controller = new AbortController()
  let resolveTerminal!: (reason: TerminalReason) => void
  const terminal = new Promise<TerminalReason>((resolve) => { resolveTerminal = resolve })
  const onCallerAbort = () => {
    resolveTerminal('aborted')
    controller.abort()
  }
  input.signal?.addEventListener('abort', onCallerAbort, {once: true})
  const timeout = setTimeout(() => {
    resolveTerminal('timeout')
    controller.abort()
  }, input.timeoutMs)

  try {
    const fetcher = deps.fetcher ?? fetch
    const request = (async () => {
      try {
        const response = await fetcher(deps.endpoint ?? WEB3FORMS_ENDPOINT, {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({...input.payload, access_key: input.accessKey}),
          signal: controller.signal,
        })
        const mediaType = responseMediaType(response)
        let body: unknown
        if (canContainJson(mediaType)) {
          try {
            body = await response.json()
          } catch {
            body = undefined
          }
        }
        return {type: 'response' as const, response, mediaType, providerCategory: classifyWeb3FormsResponse(response.status, body)}
      } catch {
        return {type: 'network' as const}
      }
    })()
    const settled = await Promise.race([
      request,
      terminal.then((reason) => ({type: 'terminal' as const, reason})),
    ])

    if (settled.type === 'terminal') {
      return result(input, 'submission_unconfirmed', settled.reason)
    }
    if (settled.type === 'network') {
      return result(input, 'submission_unconfirmed', 'network')
    }

    const {response, mediaType, providerCategory} = settled

    if (providerCategory === 'accepted') {
      return result(input, 'provider_accepted', 'accepted', response.status, mediaType)
    }
    if (providerCategory === 'rejected') {
      return result(input, 'provider_rejected', 'rejected', response.status, mediaType)
    }
    if (response.status === 400 || response.status === 422) {
      return result(input, 'provider_rejected', providerCategory, response.status, mediaType)
    }
    if (response.status === 429) {
      return result(input, 'provider_rejected', 'rate_limited', response.status, mediaType)
    }
    return result(input, 'submission_unconfirmed', 'unexpected', response.status, mediaType)
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener('abort', onCallerAbort)
  }
}
