import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import chrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

const assets = [
  ['primary', 'brand_logo_primary_horizontal', 'tio2-malaysia-primary-horizontal-v0.1.svg', 4342, 'eeed3a758e7ae1b847238d1c88e86eee7a8e67b863969af4d286747e9a72487c'],
  ['reverse', 'brand_logo_reverse_monochrome', 'tio2-malaysia-reverse-monochrome-v0.1.svg', 2725, '7cfaeafa02ac8469a006c9489db2f92b15b2621e4151b04efe1b30fc734c1b5e'],
  ['symbol', 'brand_symbol_primary', 'tio2-malaysia-symbol-v0.1.svg', 2510, '9fd1fafafad4bc6fef0c05f499c27baf1051eef084d1b834b1061caf3b8b85a0'],
  ['favicon', 'brand_favicon_safe', 'tio2-malaysia-favicon-safe-v0.1.svg', 1107, 'f1d1b97ff66211410a50279eed16414b5a6e888c27c11419e41265168d08692c'],
] as const
const componentPath = 'components/sites/tio2-my/malaysia-global-chrome.tsx'
const cssPath = 'components/sites/tio2-my/malaysia-global-chrome.module.css'

describe('TiO2 Malaysia shared production Logo contract', () => {
  it('resolves all four Manifest keys to exact, site-local SVG bytes', () => {
    expect(chrome.logoManifestId).toBe('TIO2MY-PRODUCTION-SVG-LOGO-MANIFEST-01')
    for (const [slot, key, file, bytes, sha256] of assets) {
      const binding = chrome.logo[slot]
      expect(binding.assetKey).toBe(key)
      expect(binding.src).toBe(`/tio2-my/brand/${file}`)
      const payload = readFileSync(`public${binding.src}`)
      expect(payload.byteLength).toBe(bytes)
      expect(createHash('sha256').update(payload).digest('hex')).toBe(sha256)
      expect(payload.toString('utf8')).not.toMatch(/<image|data:image|<script|@import/iu)
    }
  })

  it('keeps navigation and all RFQ targets within the Malaysia route contract', () => {
    expect(chrome.navigation.map((item) => item.targetPageId)).toEqual([
      'HOME-001', 'MARKET-000', 'PRODUCT-000', 'APP-000',
      'DOC-000', 'RES-000', 'ABOUT-001',
    ])
    expect(chrome.rfq).toMatchObject({
      targetPageId: 'CONV-RFQ', href: '/request-a-quote/',
    })
    expect(JSON.stringify(chrome)).not.toMatch(/\.png|tio2products|tio2hub|tiovar/iu)
  })

  it('expresses current navigation state without a visible CURRENT label', () => {
    const component = readFileSync(componentPath, 'utf8')
    const css = readFileSync(cssPath, 'utf8')

    expect(component).not.toMatch(/currentLabel|>Current</u)
    expect(component.match(/aria-current=\{current \? 'page' : undefined\}/gu)).toHaveLength(2)
    expect(css).toMatch(/\.desktopNav a\[aria-current='page'\]\s*\{[^}]*font-weight:\s*800/iu)
    expect(css).toMatch(/\.desktopNav a\[aria-current='page'\]::after\s*\{[^}]*background:\s*#006a63/iu)
    expect(css).toMatch(/\.mobileNav a\[aria-current='page'\]\s*\{[^}]*font-weight:\s*800/iu)
    expect(css).toMatch(/\.mobileNav a\[aria-current='page'\]::before\s*\{[^}]*left:\s*8px[^}]*width:\s*4px[^}]*background:\s*#14b8a6/iu)
  })
})
