const DEFAULT_TEXT_MAX_LENGTH = 200
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

export function normalizePlainText(
  value: string,
  maxLength = DEFAULT_TEXT_MAX_LENGTH,
): string {
  const normalized = value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

  return Array.from(normalized).slice(0, maxLength).join('').trim()
}

export function htmlToPlainText(
  html: string,
  maxLength = DEFAULT_TEXT_MAX_LENGTH,
): string {
  const decodedText = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/giu, ' ')
    .replace(/<!--[\s\S]*?(?:-->|$)/gu, ' ')
    .replace(/<[^>]*$/gu, ' ')
    .replace(/<[^>]*>/gu, ' ')
    .replace(HTML_ENTITY_PATTERN, decodeEntity)

  return normalizePlainText(decodedText, maxLength)
}
