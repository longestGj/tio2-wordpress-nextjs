import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const css = readFileSync(
  resolve(
    process.cwd(),
    'components/sites/tio2-a/homepage/homepage.module.css',
  ),
  'utf8',
)

function cssRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'iu'))
  if (!match?.[1]) throw new Error(`Missing CSS rule: ${selector}`)
  return match[1]
}

function customProperty(name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[\\da-f]{6})`, 'iu'))
  if (!match?.[1]) throw new Error(`Missing CSS custom property: ${name}`)
  return match[1]
}

function resolveColor(value: string): string {
  const variable = value.match(/^var\((--[a-z0-9-]+)\)$/iu)?.[1]
  return variable ? customProperty(variable) : value
}

function linearChannel(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/gu)
    ?.map((channel) => linearChannel(Number.parseInt(channel, 16)))
  if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`)
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (left, right) => right - left,
  )
  return (lighter! + 0.05) / (darker! + 0.05)
}

describe('Site A editorial Homepage styles', () => {
  it('scopes the approved palette to the Homepage root', () => {
    expect(css).toMatch(/\.homepage\s*\{[^}]*--site-a-paper:\s*#f2eadc/iu)
    expect(css).toContain('--site-a-soft: #faf6ed')
    expect(css).toContain('--site-a-ink: #29231d')
    expect(css).toContain('--site-a-muted: #6b5e50')
    expect(css).toContain('--site-a-rust: #985027')
    expect(css).toContain('--site-a-green: #233b31')
    expect(css).toContain('--site-a-rule: #b9aa96')
    expect(css).not.toMatch(/(^|[},]\s*)(body|html|:root)(?:\s|,|\{)/imu)
  })

  it('keeps focus, responsive layout, and reduced-motion behavior explicit', () => {
    expect(css).toContain(':focus-visible')
    expect(css).toMatch(/outline:\s*(?:[2-9]|\d{2,})px\s/iu)
    expect(css).toContain('outline-offset:')
    expect(css).toContain('@media (max-width: 780px)')
    expect(css).toContain('@media (max-width: 460px)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-duration: 0.01ms')
    expect(css).toContain('animation-iteration-count: 1')
    expect(css).toContain('transition-duration: 0.01ms')
  })

  it('keeps the Closing focus indicator at 3:1 against its adjacent rust background', () => {
    const focusRule = cssRule('.closingCta > a:focus-visible')
    const outlineColor = focusRule.match(
      /outline:\s*\d+px\s+solid\s+([^;]+);/iu,
    )?.[1]?.trim()
    if (!outlineColor) throw new Error('Missing Closing focus outline color')

    expect(
      contrastRatio(resolveColor(outlineColor), customProperty('--site-a-rust')),
    ).toBeGreaterThanOrEqual(3)
  })
})
