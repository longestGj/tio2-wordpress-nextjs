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
})
