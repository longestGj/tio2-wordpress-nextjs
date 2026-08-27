import sanitizeHtml from 'sanitize-html'

import {htmlToPlainText} from '@/lib/seo/text'

const INTERNAL_PATH_PATTERN =
  /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/u

const PRIVATE_DOCUMENT_LOCATION_PATTERN =
  /(?:\bfile:\/\/|(?:^|[^a-z0-9])[a-z]:[\\/]|\/documents\/tds(?:\/|(?=$|[\s"'<>),.;:!?#]))|\/tds(?:\/|(?=$|[\s"'<>),.;:!?#]))|\.pdf\b)/iu
const DOCUMENT_LOCATION_ENTITY_PATTERN =
  /&(?:#(\d+)|#x([\da-f]+)|(sol|bsol|period|colon));/giu

function decodeDocumentLocationEntities(value: string): string {
  return value.replace(
    DOCUMENT_LOCATION_ENTITY_PATTERN,
    (entity, decimal: string | undefined, hexadecimal: string | undefined, named: string | undefined) => {
      if (named) {
        return {sol: '/', bsol: '\\', period: '.', colon: ':'}[named.toLowerCase()] ?? entity
      }
      const codePoint = Number.parseInt(
        decimal ?? hexadecimal ?? '',
        decimal ? 10 : 16,
      )
      return Number.isSafeInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity
    },
  )
}

export function containsPrivateProductDocumentLocation(value: string): boolean {
  return PRIVATE_DOCUMENT_LOCATION_PATTERN.test(decodeDocumentLocationEntities(value))
}

export function normalizeProductInternalPath(value: string): string | null {
  const path = value.trim()
  if (!INTERNAL_PATH_PATTERN.test(path)) return null
  return path.endsWith('/') ? path.slice(0, -1) : path
}

export function sanitizeProductRichText(source: string): string {
  return sanitizeHtml(source, {
    allowedTags: ['p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'a', 'br'],
    allowedAttributes: {a: ['href', 'title']},
    allowedSchemes: [],
    allowProtocolRelative: false,
    nonTextTags: ['script', 'style', 'textarea', 'option', 'iframe'],
    transformTags: {
      a: (_tagName, attributes) => {
        const exposesPrivateLocation = Object.values(attributes).some(
          containsPrivateProductDocumentLocation,
        )
        const href = attributes.href
          && !exposesPrivateLocation
          ? normalizeProductInternalPath(attributes.href)
          : null
        const attribs: Record<string, string> = {}
        if (href) attribs.href = href
        const title = href ? attributes.title?.trim() : undefined
        if (title) attribs.title = title
        return {
          tagName: 'a',
          attribs,
        }
      },
    },
  }).trim()
}

export function productRichTextWordCount(source: string): number {
  const text = htmlToPlainText(sanitizeProductRichText(source), Number.MAX_SAFE_INTEGER)
  return text ? text.split(/\s+/u).length : 0
}

export function hasProductRichTextContent(source: string): boolean {
  return htmlToPlainText(source, Number.MAX_SAFE_INTEGER).length > 0
}
