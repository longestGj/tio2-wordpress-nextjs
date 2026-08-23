export function tamperTokenSegmentByte(
  token: string,
  segment: 'payload' | 'signature',
): string {
  const parts = token.split('.')
  if (parts.length !== 2) throw new Error('Expected a two-segment token')

  const index = segment === 'payload' ? 0 : 1
  const encoded = parts[index]
  if (!encoded) throw new Error(`Token ${segment} segment is empty`)

  const bytes = Buffer.from(encoded, 'base64url')
  if (bytes.length === 0) throw new Error(`Token ${segment} segment has no bytes`)
  bytes[0] ^= 0x01
  parts[index] = bytes.toString('base64url')

  return parts.join('.')
}
