import sanitizeHtml from 'sanitize-html'

import {htmlToPlainText} from '@/lib/seo/text'

const INTERNAL_PATH_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/u
const PRIVATE_LOCATION_PATTERN = /(?:\bfile:\/\/|(?:^|[^a-z0-9])[a-z]:[\\/]|\/(?:documents\/tds|tds)(?:\/|(?=$|[\s"'<>),.;:!?#]))|\.pdf\b)/iu

export function normalizeEditorialInternalPath(value: string): string | null {
  const path = value.trim()
  if (!INTERNAL_PATH_PATTERN.test(path)) return null
  return path === '/' ? path : path.replace(/\/+$/u, '')
}

export function containsPrivateEditorialLocation(value: string): boolean {
  return PRIVATE_LOCATION_PATTERN.test(value)
}

export function sanitizeEditorialRichText(source: string): string {
  return sanitizeHtml(source, {
    allowedTags: ['p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'a', 'br'],
    allowedAttributes: {a: ['href', 'title']},
    allowedSchemes: [],
    allowProtocolRelative: false,
    nonTextTags: ['script', 'style', 'textarea', 'option', 'iframe'],
    transformTags: {
      a: (_tagName, attributes) => {
        const href = attributes.href && !Object.values(attributes).some(containsPrivateEditorialLocation)
          ? normalizeEditorialInternalPath(attributes.href)
          : null
        const attribs: Record<string, string> = {}
        if (href) attribs.href = href
        if (href && attributes.title?.trim()) attribs.title = attributes.title.trim()
        return {tagName: 'a', attribs}
      },
    },
  }).trim()
}

export function hasEditorialRichTextContent(source: string): boolean {
  return htmlToPlainText(source, Number.MAX_SAFE_INTEGER).length > 0
}
