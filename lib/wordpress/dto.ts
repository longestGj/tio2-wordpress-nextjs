import type {ContentPageFieldsFragment} from './generated'
import {htmlToPlainText} from '@/lib/seo/text'
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

export function deriveExcerptFromHtml(html: string): string {
  return htmlToPlainText(html)
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
    title: htmlToPlainText(node.title ?? ''),
    excerpt: deriveExcerptFromHtml(node.content ?? ''),
    html: node.content ?? '',
    modified: normalizeWordPressGmt(node.modifiedGmt),
    status: node.status ?? '',
    seo: {
      title: htmlToPlainText(node.publishingFields?.seoTitle ?? ''),
      description: htmlToPlainText(
        node.publishingFields?.seoDescription ?? '',
      ),
    },
    relatedEntityIds: [...(node.relatedEntityIds ?? [])],
  }
}
