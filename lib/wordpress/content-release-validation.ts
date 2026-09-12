import paths from '@/wordpress/plugins/tio2-site-model/includes/content-release-paths.json'

const policies: Readonly<Record<string, readonly string[]>> = paths
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const plain = (value: string) => value.length > 0 && value.length <= 100000 && value.trim() === value && !/[<>\u0000-\u001f\u007f]/u.test(value)

/** Text-only HTML edits preserve every installed tag/attribute, including evidence
 * markers, conditional sections and link destinations. Existing DTO sanitizer still runs. */
function sameHtmlStructure(candidate: string, installed: string): boolean {
  if (!candidate.trim() || candidate.length > 2000000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(candidate)) return false
  const parts = (html: string) => html.split(/(<[^>]*>)/u)
  const left = parts(candidate), right = parts(installed)
  return left.length === right.length && left.every((part, index) => index % 2 ? part === right[index] : !/[<>]/u.test(part))
}

/** Installed identity and explicit field policy are trusted code. Content is not.
 * Unlisted fields, missing/extra keys, order/cardinality and scalar types stay fixed.
 * This function does not establish approval; the release receipt binds that separately. */
export function matchesInstalledContent(candidate: unknown, installed: unknown, pageId?: string, root = ''): boolean {
  const identity = object(installed) && object(installed.identity) ? installed.identity : null
  const page = object(installed) && object(installed.page) ? installed.page : null
  const id = pageId ?? (identity?.pageId as string | undefined) ?? (page?.page_id as string | undefined) ?? (object(installed) ? installed.pageId as string | undefined : undefined)
  const editable = id && policies[id]
  if (!editable) return false
  const visit = (actual: unknown, expected: unknown, path: string): boolean => {
    if (actual === expected) return true
    if (typeof actual === 'string' && typeof expected === 'string' && editable.includes(path)) {
      if (path === 'bodyHtml') return sameHtmlStructure(actual, expected)
      if (path === 'buyerVisibleMarkdown') {
        const structure = (text: string) => JSON.stringify([text.match(/^(?:#{1,6} .*|\*\*(?:Last updated|Kemas kini terakhir):.*|(?:Actions|Tindakan):.*)$/gmu), [...text.matchAll(/\[[^\]]*\]\(([^)]*)\)/gu)].map(match => match[1])])
        return actual.length <= 100000 && actual.trim().length > 0 && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(actual) && structure(actual) === structure(expected)
      }
      return plain(actual)
    }
    if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((item,index) => visit(actual[index],item,path ? `${path}.${index}` : String(index)))
    if (object(expected)) return object(actual) && Object.keys(actual).length === Object.keys(expected).length && Object.keys(expected).every(key => Object.hasOwn(actual,key) && visit(actual[key],expected[key],path ? `${path}.${key}` : key))
    return false
  }
  return visit(candidate, installed, root)
}
/** Carry only explicitly editable validated text into a projected baseline. The caller
 * must still run its complete projection validator (including omissions/evidence). */
export function installedContentWithDeliveredText<T>(candidate: unknown, installed: T): T {
  if (!object(installed)) return installed
  const identity = object(installed.identity) ? installed.identity : null
  const id = identity?.pageId as string | undefined
  if (!id || !policies[id]) return installed
  const result = structuredClone(installed)
  for (const path of policies[id]) {
    const keys = path.split('.')
    let actual: unknown = candidate, expected: unknown = result
    for (const key of keys.slice(0,-1)) {
      const expectedItem: unknown = expected && typeof expected === 'object' ? (expected as Record<string,unknown>)[key] : undefined
      if (Array.isArray(actual) && Array.isArray(expected) && object(expectedItem)) {
        const installedItems = expected
        const identityKey = ['targetPageId','id','key'].find(field => typeof expectedItem[field] === 'string' && installedItems.filter(item => object(item) && item[field] === expectedItem[field]).length === 1)
        actual = identityKey ? actual.find(item => object(item) && item[identityKey] === expectedItem[identityKey]) : actual[Number(key)]
      } else actual = actual && typeof actual === 'object' ? (actual as Record<string,unknown>)[key] : undefined
      expected = expectedItem
    }
    const key = keys.at(-1)!
    if (!actual || typeof actual !== 'object' || !expected || typeof expected !== 'object') continue
    const value = (actual as Record<string,unknown>)[key]
    if (value === undefined) continue
    const previous = (expected as Record<string,unknown>)[key]
    if (!matchesInstalledContent(value,previous,id,path)) throw new Error(`Invalid CMS editable content: ${path}`)
    ;(expected as Record<string,unknown>)[key] = value
  }
  return result
}
