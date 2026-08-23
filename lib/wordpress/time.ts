const WORDPRESS_GMT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/u
const UTC_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u

export function normalizeWordPressGmt(value: string | null | undefined): string {
  if (!value) return ''

  const match = WORDPRESS_GMT_PATTERN.exec(value)
  if (!match) return ''

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = ''] =
    match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const millisecond = Number(fraction.padEnd(3, '0'))
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second ||
    date.getUTCMilliseconds() !== millisecond
  ) {
    return ''
  }

  return date.toISOString()
}

export function isStrictUtcInstant(value: string): boolean {
  if (!UTC_INSTANT_PATTERN.test(value)) return false

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}
