import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaContactPage} from '@/components/sites/tio2-my/contact/malaysia-contact-page'
import {toMalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-dto'
import {malaysiaContactPageSource} from '@/tests/fixtures/tio2-my-contact-page'

describe('CONTACT-001 shared-owner integration contract', () => {
  it('assembles one Malaysia chrome and preserves every approved owner target', () => {
    const html = renderToStaticMarkup(<MalaysiaContactPage page={toMalaysiaContactPageDto(malaysiaContactPageSource())} form={null} />)
    expect(html.match(/<header/gu)).toHaveLength(1)
    expect(html.match(/<footer/gu)).toHaveLength(1)
    expect(html).toContain('/tio2-my/brand/tio2-malaysia-primary-horizontal-v0.1.svg')
    expect(html).toContain('/tio2-my/brand/tio2-malaysia-reverse-monochrome-v0.1.svg')
    expect(html).not.toMatch(/tio2products\.com|tio2hub\.com|contact@tio2/iu)
    expect(html).toContain('href="/request-a-quote/"')
    expect(html).toContain('href="/request-documents/"')
    expect(html).toContain('href="/request-sample/"')
    expect(html).toContain('href="/privacy-policy/"')
    expect(html).toContain('Cookie Settings')
  })

  it('maps the Contact page to the approved About navigation owner only', () => {
    const html = renderToStaticMarkup(<MalaysiaContactPage page={toMalaysiaContactPageDto(malaysiaContactPageSource())} form={null} />)
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>') + 9)
    expect(header.match(/aria-current="page"/gu)).toHaveLength(2)
    expect(header).toMatch(/href="\/about\/"[^>]*aria-current="page"/u)
    expect(header.match(/href="\/about\/"/gu)).toHaveLength(2)
    expect(header).not.toContain('>Contact<')
  })
})
