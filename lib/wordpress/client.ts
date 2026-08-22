const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql'

export interface GraphQLErrorDetail {
  readonly message: string
  readonly locations?: ReadonlyArray<{
    readonly line: number
    readonly column: number
  }>
  readonly path?: ReadonlyArray<string | number>
  readonly extensions?: Readonly<Record<string, unknown>>
}

interface GraphQLResponse<TData> {
  readonly data?: TData
  readonly errors?: readonly GraphQLErrorDetail[]
}

export interface FetchGraphQLOptions {
  readonly tags?: readonly string[]
  readonly timeoutMs?: number
}

export class GraphQLResponseError extends Error {
  readonly errors: readonly GraphQLErrorDetail[]

  constructor(errors: readonly GraphQLErrorDetail[]) {
    super(errors.map(({message}) => message).join('; ') || 'WPGraphQL error')
    this.name = 'GraphQLResponseError'
    this.errors = errors
  }
}

export class GraphQLTransportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'GraphQLTransportError'
  }
}

export class GraphQLHttpError extends GraphQLTransportError {
  readonly status: number
  readonly statusText: string

  constructor(status: number, statusText: string) {
    super(`WPGraphQL HTTP ${status}${statusText ? `: ${statusText}` : ''}`)
    this.name = 'GraphQLHttpError'
    this.status = status
    this.statusText = statusText
  }
}

export class GraphQLTimeoutError extends GraphQLTransportError {
  readonly timeoutMs: number

  constructor(timeoutMs: number, options?: ErrorOptions) {
    super(`WPGraphQL request timed out after ${timeoutMs}ms`, options)
    this.name = 'GraphQLTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export class GraphQLNetworkError extends GraphQLTransportError {
  constructor(cause: unknown) {
    super('WPGraphQL network request failed', {cause})
    this.name = 'GraphQLNetworkError'
  }
}

export async function fetchGraphQL<TData, TVariables>(
  document: string,
  variables: TVariables,
  options: FetchGraphQLOptions = {},
): Promise<TData> {
  const endpoint =
    process.env.WORDPRESS_GRAPHQL_URL ?? DEFAULT_GRAPHQL_ENDPOINT
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const signal = AbortSignal.timeout(timeoutMs)
  const requestInit: RequestInit & {
    next?: {readonly tags: readonly string[]}
  } = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({query: document, variables}),
    cache: 'force-cache',
    signal,
  }

  if (options.tags?.length) {
    requestInit.next = {tags: [...options.tags]}
  }

  let response: Response

  try {
    response = await fetch(endpoint, requestInit)
  } catch (error) {
    if (signal.aborted) {
      throw new GraphQLTimeoutError(timeoutMs, {cause: error})
    }

    throw new GraphQLNetworkError(error)
  }

  if (!response.ok) {
    throw new GraphQLHttpError(response.status, response.statusText)
  }

  let payload: GraphQLResponse<TData>

  try {
    payload = (await response.json()) as GraphQLResponse<TData>
  } catch (error) {
    throw new GraphQLNetworkError(error)
  }

  if (payload.errors?.length) {
    throw new GraphQLResponseError(payload.errors)
  }

  if (payload.data === undefined) {
    throw new GraphQLNetworkError(new Error('WPGraphQL response has no data'))
  }

  return payload.data
}
