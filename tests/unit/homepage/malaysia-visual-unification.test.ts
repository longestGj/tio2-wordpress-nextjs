import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const component = readFileSync(
  resolve(process.cwd(), 'components/sites/tio2-my/homepage/malaysia-homepage.tsx'),
  'utf8',
)
const css = readFileSync(
  resolve(process.cwd(), 'components/sites/tio2-my/homepage/malaysia-homepage.module.css'),
  'utf8',
)

describe('HOME-001 Applications-aligned visual contract', () => {
  it('uses the approved body palette, shell, radius, and restrained shadow tokens', () => {
    for (const declaration of [
      '--navy: #062b5b',
      '--navy-deep: #031b3a',
      '--teal: #007f77',
      '--teal-light: #00a99d',
      '--ink: #334155',
      '--muted: #64748b',
      '--pale: #f5f8fb',
      '--line: #d9e2ec',
      '--white: #fff',
      '--shell: 1200px',
      '--surface-radius: 14px',
      '--card-radius: 12px',
      '--shadow: 0 14px 34px rgba(3, 27, 58, .07)',
    ]) {
      expect(css).toContain(declaration)
    }
  })

  it('keeps the Hero powder image visible in a bounded card at every accepted width', () => {
    expect(component).toMatch(/<Image[\s\S]*?alt=""[\s\S]*?className=\{styles\.heroImage\}/u)
    expect(component).not.toContain('TITANIUM DIOXIDE MATERIAL')
    expect(css).toMatch(/\.hero\s*\{[^}]*width:\s*min\(var\(--shell\),\s*calc\(100%\s*-\s*64px\)\)[^}]*border-radius:\s*var\(--surface-radius\)/u)
    expect(css).toMatch(/\.heroVisual\s*\{[^}]*border-radius:\s*var\(--card-radius\)[^}]*overflow:\s*hidden/u)
    expect(css).not.toMatch(/\.heroImage[^{}]*\{[^}]*display:\s*none/u)
  })

  it('exposes stable card families while keeping shared Chrome as the only page Chrome', () => {
    for (const styleHook of [
      'styles.startItem',
      'styles.marketCard',
      'styles.applicationCard',
      'styles.company',
      'styles.documentCard',
      'styles.resourceCard',
      'styles.answerCard',
    ]) {
      expect(component).toContain(styleHook)
    }
    expect(component.match(/<MalaysiaGlobalHeader/gu)).toHaveLength(1)
    expect(component.match(/<MalaysiaGlobalFooter/gu)).toHaveLength(1)
    expect(component).not.toMatch(/function\s+(?:HomeHeader|HomeFooter|HomeMenu)/u)
  })

  it('uses the approved desktop, tablet, and mobile compositions', () => {
    expect(css).toMatch(/\.startHere\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/u)
    expect(css).toMatch(/\.productGrid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/u)
    expect(css).toMatch(/\.applicationGrid\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/u)
    expect(css).toMatch(/\.resourceGrid\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/u)
    expect(css).toMatch(/@media\s*\(max-width:\s*1100px\)[\s\S]*?\.productGrid\s*\{[^}]*repeat\(2,/u)
    expect(css).toMatch(/@media\s*\(max-width:\s*560px\)[\s\S]*?\.startHere\s*\{[^}]*grid-template-columns:\s*1fr/u)
  })

  it('keeps Documents light and reserves the only dark Home body surface for page RFQ', () => {
    expect(css).toMatch(/\.documents\s*\{[^}]*background:\s*var\(--pale\)/u)
    expect(css).not.toMatch(/\.documents\s*\{[^}]*color:\s*#fff/u)
    expect(css).toMatch(/\.pageRfq\s*\{[^}]*border-radius:\s*var\(--surface-radius\)[^}]*background:\s*linear-gradient\([^}]*var\(--navy\)[^}]*var\(--navy-deep\)/u)
    expect(css).toMatch(/@media\s*\(max-width:\s*560px\)[\s\S]*?\.pageRfq\s*\{[^}]*display:\s*none/u)
  })
})
