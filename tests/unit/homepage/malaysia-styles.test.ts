import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const css = readFileSync(
  resolve(process.cwd(), 'components/sites/tio2-my/homepage/malaysia-homepage.module.css'),
  'utf8',
)

function property(name: string): string {
  const value = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'iu'))?.[1]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function channel(value: number): number {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const values = hex.slice(1).match(/.{2}/gu)?.map((part) => channel(Number.parseInt(part, 16)))
  if (!values || values.length !== 3) throw new Error(`Invalid color ${hex}`)
  return 0.2126 * values[0]! + 0.7152 * values[1]! + 0.0722 * values[2]!
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter! + 0.05) / (darker! + 0.05)
}

describe('Malaysia Homepage accessible palette', () => {
  it('keeps dark teal text and white-on-teal CTAs at WCAG AA contrast', () => {
    const teal = property('--teal')
    expect(teal.toLowerCase()).toBe('#007f77')
    expect(contrast(teal, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrast(teal, property('--pale'))).toBeGreaterThanOrEqual(4.5)
  })

  it('uses a separately tested light teal on dark page surfaces', () => {
    const lightTeal = property('--teal-light')
    expect(contrast(lightTeal, '#063873')).toBeGreaterThanOrEqual(4.5)
    expect(contrast(lightTeal, property('--navy-deep'))).toBeGreaterThanOrEqual(4.5)
    expect(css).toContain('.documents .eyebrow, .pageRfq .eyebrow')
  })
})
