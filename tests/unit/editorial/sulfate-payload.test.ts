import {createHash} from 'node:crypto'
import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {JSDOM} from 'jsdom'
import {describe, expect, it} from 'vitest'

const payloadPath = resolve('wordpress/plugins/tio2-site-model/config/tio2-my-editorial-product-proc-su.json')
function readPayload() {
  expect(existsSync(payloadPath), 'Sulfate CMS payload must exist').toBe(true)
  return JSON.parse(readFileSync(payloadPath, 'utf8'))
}

describe('approved Sulfate editorial export', () => {
  it('preserves the five neutral Grade entries and links in the approved visible order', () => {
    const payload = readPayload()
    const document = new JSDOM(`<main>${payload.bodyHtml}</main>`).window.document
    expect(payload.identity).toMatchObject({pageId: 'PRODUCT-PROC-SU', siteScope: 'tio2-my', section: 'products', path: '/products/sulfate-process-titanium-dioxide/'})
    expect(payload.seo.schemaType).toBe('CollectionPage')
    expect(document.querySelectorAll('main > section')).toHaveLength(5)
    expect([...document.querySelectorAll('.grades article')].map((article) => [
      article.querySelector('h3')?.textContent,
      article.querySelector('a')?.getAttribute('href'),
    ])).toEqual([
      ['M-996', '/products/m-996/'],
      ['M-2196', '/products/m-2196/'],
      ['M-108', '/products/m-108/'],
      ['M-52', '/products/m-52/'],
      ['M-2377', '/products/m-2377/'],
    ])
    expect(document.querySelectorAll('header,footer,script,style')).toHaveLength(0)
    expect(document.querySelector('#sulfate-grades')?.getAttribute('tabindex')).toBe('-1')
    expect(payload.source.renderedBodySha256).toBe(createHash('sha256').update(payload.bodyHtml).digest('hex'))
  })

  it('keeps conversion context neutral and the FTC period outside its link', () => {
    const payload = readPayload()
    const document = new JSDOM(payload.bodyHtml).window.document
    const conversions = [...document.querySelectorAll<HTMLAnchorElement>('a')]
      .filter((anchor) => /^\/request-(?:a-quote|documents)\//.test(anchor.getAttribute('href') ?? ''))
    expect(conversions).toHaveLength(3)
    for (const anchor of conversions) {
      const url = new URL(anchor.getAttribute('href')!, 'https://tio2malaysia.com')
      expect([...url.searchParams]).toEqual([['source_page_id', 'PRODUCT-PROC-SU']])
    }
    const source = document.querySelector<HTMLAnchorElement>('a[href^="https://www.ftc.gov/"]')!
    expect(source.textContent).toBe('U.S. Federal Trade Commission public decision record')
    expect(source.nextSibling?.textContent?.startsWith('. This reference')).toBe(true)
    expect(document.querySelector('a[href="/applications/"]')).not.toBeNull()
    expect(document.querySelector('a[href="/resources/chloride-vs-sulfate-titanium-dioxide/"]')).not.toBeNull()
  })

  it('scopes every body rule without corrupting functional selector lists or shipping freeze assets', () => {
    readPayload()
    const css = readFileSync(resolve('components/sites/tio2-my/editorial/product-proc-su.css'), 'utf8')
    const document = new JSDOM(`<style>${css}</style>`).window.document
    const inspect = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if ('cssRules' in rule) inspect((rule as CSSGroupingRule).cssRules)
        else expect((rule as CSSStyleRule).selectorText).toMatch(/^\[data-editorial-page="PRODUCT-PROC-SU"\] main/)
      }
    }
    inspect(document.styleSheets[0].cssRules)
    expect(css).toContain('main :is(h1,h2,h3)')
    expect(css).toContain('var(--font-my-shared)')
    expect(css).not.toMatch(/@font-face|dependencies\/|\.header\b|\.footer\b|\.cookie-layer\b/)
  })
})
