const APPLICATION_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export function applicationPathFromSegments(
  segments: readonly string[],
): string | null {
  if (segments.length < 1 || segments.length > 2) return null
  if (!segments.every((segment) => APPLICATION_SEGMENT.test(segment))) {
    return null
  }
  return `/applications/${segments.join('/')}`
}
