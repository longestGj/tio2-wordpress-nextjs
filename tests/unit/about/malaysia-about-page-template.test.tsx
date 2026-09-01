import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaAboutPage} from '@/components/sites/tio2-my/about/malaysia-about-page'
import {toMalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-dto'
import {malaysiaAboutPageSource} from '@/tests/fixtures/tio2-my-about-page'

describe('MalaysiaAboutPage', () => {
  it('renders the approved initial server DOM and shared Chrome only', () => {
    const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource())
    const markup = renderToStaticMarkup(<MalaysiaAboutPage aboutPage={dto} />)
    const moduleOrder = Array.from(markup.matchAll(/data-module="([^"]+)"/gu), (match) => match[1])
    expect(moduleOrder).toEqual([
      'breadcrumb', 'hero', 'who-we-are', 'why-malaysia', 'what-we-do', 'markets',
      'applications', 'how-we-work', 'documentation', 'company-facts', 'final-cta',
    ])
    expect(markup.match(/<h1(?:\s|>)/gu)).toHaveLength(1)
    expect(markup).toContain(dto.hero.h1)
    expect(markup).toContain('aria-current="page"')
    expect(markup).not.toMatch(/>\s*CURRENT\s*</u)
    expect(markup.match(/data-site-scope="tio2-my"/gu)?.length).toBeGreaterThanOrEqual(3)
    expect(markup).not.toContain('Company-provided information')
    expect(markup).not.toContain('Masterbatch</h3>')
  })

  it('keeps approved actions and child fallbacks without Contact substitution', () => {
    const markup = renderToStaticMarkup(<MalaysiaAboutPage aboutPage={toMalaysiaAboutPageDto(malaysiaAboutPageSource())} />)
    expect(markup.match(/href="\/markets\/"/gu)?.length).toBeGreaterThanOrEqual(5)
    expect(markup.match(/href="\/applications\/"/gu)?.length).toBeGreaterThanOrEqual(5)
    expect(markup.match(/href="\/request-a-quote\/"/gu)?.length).toBeGreaterThanOrEqual(4)
    expect(markup).toContain('href="/request-documents/"')
    expect(markup).not.toMatch(/href="\/markets\/(?:european-union|united-kingdom|india|brazil)\//u)
  })

  it('collapses restricted facts and copy while preserving safe modules and CTAs', () => {
    const sufficient = toMalaysiaAboutPageDto(malaysiaAboutPageSource())
    const restricted = toMalaysiaAboutPageDto(malaysiaAboutPageSource({evidenceState: 'restricted'}))
    const markup = renderToStaticMarkup(<MalaysiaAboutPage aboutPage={restricted} />)
    const restrictedParagraph = sufficient.hero.paragraphs.find(({id}) => id === 'hero.paragraph.1')
    expect(restrictedParagraph).toBeDefined()
    expect(markup).not.toContain(restrictedParagraph!.text)
    expect(markup).not.toContain('Taiping, Perak, Malaysia')
    expect(markup).not.toContain('35,000 MT per year')
    expect(markup).not.toMatch(/>\s*(?:N\/A|—|restricted|partial|sufficient)\s*</iu)
    expect(markup).toContain('data-module="hero"')
    expect(markup).toContain('data-module="final-cta"')
    expect(markup).toContain('href="/request-a-quote/"')
  })

  it('renders a neutral restricted page without orphan location or market visuals', () => {
    const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource({
      evidenceState: 'restricted',
      authorizations: {'location.full': 'restricted', 'export.port': 'not_public', 'areas.served': 'restricted'},
    }))
    const markup = renderToStaticMarkup(<MalaysiaAboutPage aboutPage={dto} />)
    expect(markup).toContain('<h1>About TiO2 Malaysia</h1>')
    expect(markup).not.toContain('ABOUT IKHLAS TITANIUM')
    expect(markup).not.toContain('Port Klang')
    expect(markup).not.toContain('data-module="markets"')
    expect(markup).not.toMatch(/portScene|routeMap|marketMap|heroBag/u)
    expect(markup).toContain('data-module="final-cta"')
    expect(markup).toContain('href="/request-a-quote/"')
  })
})
