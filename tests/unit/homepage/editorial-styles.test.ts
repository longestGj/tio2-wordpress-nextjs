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
})
