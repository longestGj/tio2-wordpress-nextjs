import type {ContentPageFieldsFragment} from './generated'
import {
  CrossSiteContentError,
  InvalidContentPathError,
} from './types'
import type {ContentPageDto} from './types'
import {normalizeWordPressGmt} from './time'

const MAX_INTERNAL_SLUG_LENGTH = 180
const PUBLIC_PATH_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/

type ContentPageSource = ContentPageFieldsFragment & {
  readonly relatedEntityIds?: readonly string[] | null
}

const EXCERPT_MAX_LENGTH = 200
const HTML_ENTITY_PATTERN = /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/giu
const NAMED_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
})

function decodeEntity(
  _entity: string,
  decimal: string | undefined,
  hexadecimal: string | undefined,
  named: string | undefined,
): string {
  if (named) return NAMED_ENTITIES[named.toLowerCase()] ?? ' '

  const codePoint = Number.parseInt(decimal ?? hexadecimal ?? '', decimal ? 10 : 16)
  if (
    !Number.isSafeInteger(codePoint) ||
    codePoint <= 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
    (codePoint < 0x20 && ![0x09, 0x0a, 0x0d].includes(codePoint))
  ) {
    return ' '
  }

  return String.fromCodePoint(codePoint)
}

export function deriveExcerptFromHtml(html: string): string {
  const plainText = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/giu, ' ')
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<[^>]*>/gu, ' ')
    .replace(HTML_ENTITY_PATTERN, decodeEntity)
    .replace(/\s+/gu, ' ')
    .trim()

  return Array.from(plainText).slice(0, EXCERPT_MAX_LENGTH).join('').trim()
}

function assertPublicPath(path: unknown): asserts path is string {
  if (typeof path !== 'string' || !PUBLIC_PATH_PATTERN.test(path)) {
    throw new InvalidContentPathError(String(path ?? ''))
  }
}

export function buildInternalSlug(siteId: string, path: string): string {
  assertPublicPath(path)

  const pathSlug = path === '/' ? 'home' : path.slice(1).replaceAll('/', '--')
  const internalSlug = `${siteId}--${pathSlug}`

  if (internalSlug.length > MAX_INTERNAL_SLUG_LENGTH) {
    throw new InvalidContentPathError(
      path,
      `Internal slug exceeds ${MAX_INTERNAL_SLUG_LENGTH} characters`,
    )
  }

  return internalSlug
}

export function toContentPageDto(
  node: ContentPageSource,
  expectedSiteId: string,
  expectedPath?: string,
): ContentPageDto {
  const actualSiteIds =
    node.siteScopes?.nodes.flatMap(({slug}) => (slug ? [slug] : [])) ?? []

  if (!actualSiteIds.includes(expectedSiteId)) {
    throw new CrossSiteContentError(expectedSiteId, actualSiteIds)
  }

  const publicPath = node.publishingFields?.publicPath
  assertPublicPath(publicPath)

  if (expectedPath !== undefined) {
    assertPublicPath(expectedPath)

    if (publicPath !== expectedPath) {
      throw new InvalidContentPathError(
        publicPath,
        `Content path ${publicPath} does not match requested path ${expectedPath}`,
      )
    }
  }

  return {
    id: node.id,
    siteId: expectedSiteId,
    path: publicPath,
    title: node.title ?? '',
    excerpt: deriveExcerptFromHtml(node.content ?? ''),
    html: node.content ?? '',
    modified: normalizeWordPressGmt(node.modifiedGmt),
    status: node.status ?? '',
    seo: {
      title: node.publishingFields?.seoTitle ?? '',
      description: node.publishingFields?.seoDescription ?? '',
    },
    relatedEntityIds: [...(node.relatedEntityIds ?? [])],
  }
}
