import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const css = readFileSync(
  resolve(process.cwd(), 'components/homepage/homepage.module.css'),
  'utf8',
)

function customProperty(name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'iu'))
  if (!match?.[1]) throw new Error(`Missing CSS custom property ${name}`)
  return match[1]
}

function ruleContaining(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const match = css.match(new RegExp(`[^{}]*${escaped}[^{}]*\\{([^}]*)\\}`, 'u'))
  if (!match?.[1]) throw new Error(`Missing CSS rule for ${selector}`)
  return match[1]
}

function channel(value: number): number {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/gu)?.map((part) => channel(Number.parseInt(part, 16)))
  if (!channels || channels.length !== 3) throw new Error(`Invalid color ${hex}`)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('homepage focus and motion styles', () => {
  it('uses focus indicators with at least 3:1 contrast on representative light and dark surfaces', () => {
    const lightRule = ruleContaining('.homepage a:focus-visible')
    const rfqOuterRule = ruleContaining('.rfqSection:focus-visible')
    const rfqControlRule = ruleContaining('.field input:focus-visible')

    expect(lightRule).toContain('var(--home-mineral-green)')
    expect(rfqOuterRule).toContain('var(--home-mineral-green)')
    expect(rfqControlRule).toContain('var(--home-brass)')
    expect(
      contrast(customProperty('--home-mineral-green'), customProperty('--home-warm-white')),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrast(customProperty('--home-brass'), customProperty('--home-mineral-green')),
    ).toBeGreaterThanOrEqual(3)
  })

  it('fully disables transitions and animations when reduced motion is requested', () => {
    const reducedMotion = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))

    expect(reducedMotion).toContain('transition: none !important')
    expect(reducedMotion).toContain('animation: none !important')
    expect(reducedMotion).not.toContain('transition-duration')
    expect(reducedMotion).not.toContain('animation-duration')
  })

  it('keeps small inquiry step text at 4.5:1 contrast on warm white', () => {
    const stepNumberRule = ruleContaining('.stepNumber')

    expect(stepNumberRule).toContain('var(--home-mineral-green)')
    expect(
      contrast(
        customProperty('--home-mineral-green'),
        customProperty('--home-warm-white'),
      ),
    ).toBeGreaterThanOrEqual(4.5)
  })
})
