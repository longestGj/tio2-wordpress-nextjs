export type BrowserQuery = Record<string, string | string[] | undefined>

export function readBrowserQuery(search: string): BrowserQuery {
  const query: BrowserQuery = {}
  for (const [key, value] of new URLSearchParams(search)) {
    const current = query[key]
    query[key] = current === undefined
      ? value
      : Array.isArray(current)
        ? [...current, value]
        : [current, value]
  }
  return query
}
