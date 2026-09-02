import {createHash} from 'node:crypto'
import {existsSync, readFileSync} from 'node:fs'
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
const homeComponentPath = 'components/sites/tio2-my/homepage/malaysia-homepage.tsx'
const homeCssPath = 'components/sites/tio2-my/homepage/malaysia-homepage.module.css'
const marketComponentPath = 'components/sites/tio2-my/markets/malaysia-market-hub.tsx'
const marketCssPath = 'components/sites/tio2-my/markets/malaysia-market-hub.module.css'
const productComponentPath = 'components/sites/tio2-my/products/malaysia-product-hub.tsx'
const productCssPath = 'components/sites/tio2-my/products/malaysia-product-hub.module.css'
const productDetailComponentPath = 'components/sites/tio2-my/products/malaysia-product-detail.tsx'
const productDetailCssPath = 'components/sites/tio2-my/products/malaysia-product-detail.module.css'
const resourceComponentPath = 'components/sites/tio2-my/resources/malaysia-resource-hub.tsx'
const resourceCssPath = 'components/sites/tio2-my/resources/malaysia-resource-hub.module.css'
const documentsComponentPath = 'components/sites/tio2-my/documents/malaysia-documents-hub.tsx'
const documentsCssPath = 'components/sites/tio2-my/documents/malaysia-documents-hub.module.css'
const legacyHomeHeaderPath = 'components/sites/tio2-my/malaysia-header.tsx'

describe('TiO2 Malaysia shared Global Chrome contract', () => {
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
    expect(chrome.contractId).toBe('GLOBAL-CHROME-005')
    expect(chrome.navigation.map((item) => item.targetPageId)).toEqual([
      'HOME-001', 'MARKET-000', 'PRODUCT-000', 'APP-000',
      'DOC-000', 'RES-000', 'ABOUT-001',
    ])
    expect(chrome.rfq).toMatchObject({
      targetPageId: 'CONV-RFQ', href: '/request-a-quote/',
    })
    expect(chrome.footer.headings).toEqual({
      explore: 'Explore', information: 'Information', procurement: 'Procurement',
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
    expect(css).toMatch(/\.header nav\.mobileNav > a\s*\{[^}]*align-items:\s*flex-start[^}]*text-align:\s*left/iu)
  })

  it('is the only Header, Mobile Menu and Footer implementation consumed by Malaysia pages', () => {
    const home = readFileSync(homeComponentPath, 'utf8')
    const market = readFileSync(marketComponentPath, 'utf8')
    const product = readFileSync(productComponentPath, 'utf8')
    const productDetail = readFileSync(productDetailComponentPath, 'utf8')
    const resource = readFileSync(resourceComponentPath, 'utf8')
    const documents = readFileSync(documentsComponentPath, 'utf8')

    expect(existsSync(legacyHomeHeaderPath)).toBe(false)
    for (const page of [home, market, product, productDetail, resource, documents]) {
      expect(page).toMatch(/from '\.\.\/malaysia-global-chrome'/u)
      expect(page.match(/<MalaysiaGlobalHeader/gu)).toHaveLength(1)
      expect(page.match(/<MalaysiaGlobalFooter/gu)).toHaveLength(1)
    }
    expect(home).toMatch(/currentPageId="HOME-001"/u)
    expect(home).toMatch(/sourcePageId="HOME-001"/u)
    expect(market).toMatch(/currentPageId="MARKET-000"/u)
    expect(market).toMatch(/sourcePageId="MARKET-000"/u)
    expect(product).toMatch(/currentPageId="PRODUCT-000"/u)
    expect(product).toMatch(/sourcePageId="PRODUCT-000"/u)
    expect(productDetail).toMatch(/currentPageId="PRODUCT-000"/u)
    expect(productDetail.match(/sourcePageId=\{pageId\}/gu)).toHaveLength(2)
    expect(resource).toMatch(/currentPageId="RES-000"/u)
    expect(resource).toMatch(/sourcePageId="RES-000"/u)
    expect(documents).toMatch(/currentPageId="DOC-000"/u)
    expect(documents).toMatch(/sourcePageId="DOC-000"/u)
  })

  it('prevents page CSS from styling any shared Chrome surface', () => {
    const forbiddenChromeSelector = /\.(?:header|headerInner|logoLink|logo|desktopNav|headerRfq|rfqCompact|menuButton|mobileNav|footer|footerGrid|footerLogo|copyright)(?:\s|,|\{|:|\.)/u
    const homeCss = readFileSync(homeCssPath, 'utf8')
    const marketCss = readFileSync(marketCssPath, 'utf8')
    const productCss = readFileSync(productCssPath, 'utf8')
    const productDetailCss = readFileSync(productDetailCssPath, 'utf8')
    const resourceCss = readFileSync(resourceCssPath, 'utf8')
    const documentsCss = readFileSync(documentsCssPath, 'utf8')

    expect(homeCss).not.toMatch(forbiddenChromeSelector)
    expect(marketCss).not.toMatch(forbiddenChromeSelector)
    expect(productCss).not.toMatch(forbiddenChromeSelector)
    expect(productDetailCss).not.toMatch(forbiddenChromeSelector)
    expect(resourceCss).not.toMatch(forbiddenChromeSelector)
    expect(homeCss).not.toMatch(/\.site\s+(?:\*|a|h1|h2|h3|p|:is)/u)
    expect(homeCss).toMatch(/\.homepageMain\s+a/u)
    expect(marketCss).not.toMatch(/\.site\s+(?:\*|a|h1|h2|h3|p|:is)/u)
    expect(productCss).not.toMatch(/\.site\s+(?:\*|a|h1|h2|h3|p|:is)/u)
    expect(productCss).toMatch(/\.productMain\s+a/u)
    expect(productDetailCss).not.toMatch(/\.productDetailSite\s+(?:\*|a|h1|h2|h3|p|:is)/u)
    expect(productDetailCss).toMatch(/\.productMain\s+:where\(a, button\)/u)
    expect(resourceCss).not.toMatch(/\.site\s+(?:\*|a|h1|h2|h3|p|:is)/u)
    expect(resourceCss).toMatch(/\.resourceMain\s+h2/u)
    expect(documentsCss).not.toMatch(forbiddenChromeSelector)
    expect(documentsCss).not.toMatch(/\.site\s+(?:\*|a|h1|h2|h3|p|:is)/u)
    expect(documentsCss).toMatch(/\.main\s+:is\(a,button,select\)/u)
  })

  it('resolves Home, Markets and Products through the single site-local Chrome configuration', () => {
    const homeDto = readFileSync('lib/wordpress/homepage-v04-dto.ts', 'utf8')
    const marketDto = readFileSync('lib/wordpress/market-hub-v01-dto.ts', 'utf8')
    const productDto = readFileSync('lib/wordpress/product-hub-v01-dto.ts', 'utf8')
    const productDetailDto = readFileSync('lib/wordpress/product-detail-v01-dto.ts', 'utf8')
    const resourceDto = readFileSync('lib/wordpress/resource-hub-v01-dto.ts', 'utf8')
    const documentsDto = readFileSync('lib/wordpress/documents-hub-v01-dto.ts', 'utf8')
    const configImport = "import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'"

    expect(homeDto).toContain(configImport)
    expect(marketDto).toContain(configImport)
    expect(productDto).toContain(configImport)
    expect(productDetailDto).toContain(configImport)
    expect(resourceDto).toContain(configImport)
    expect(documentsDto).toContain(configImport)
    expect(homeDto).toMatch(/return\s*\{[\s\S]*?\bglobalChrome,/u)
    expect(marketDto).toMatch(/return\s*\{[\s\S]*?\bglobalChrome,/u)
    expect(productDto).toMatch(/return\s*\{[\s\S]*?\bglobalChrome,/u)
    expect(productDetailDto).toMatch(/return\s*\{[\s\S]*?\bglobalChrome,/u)
    expect(resourceDto).toMatch(/return\s*\{[\s\S]*?\bglobalChrome,/u)
  })
})
