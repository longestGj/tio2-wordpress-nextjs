import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaContactPage} from '@/components/sites/tio2-my/contact/malaysia-contact-page'
import {toMalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-dto'
import {malaysiaContactPageSource} from '@/tests/fixtures/tio2-my-contact-page'

describe('CONTACT-001 page template', () => {
  it('renders exact page identity, order, shared Chrome and dedicated routes', () => {
    const html = renderToStaticMarkup(<MalaysiaContactPage page={toMalaysiaContactPageDto(malaysiaContactPageSource())} form={<div data-contact-form="shell" />} />)
    expect(html).toContain('data-site-scope="tio2-my"')
    expect(html).toContain('data-page-id="CONTACT-001"')
    expect(html.match(/<h1/gu)).toHaveLength(1)
    expect(html).toContain('<h1>Contact TiO2 Malaysia</h1>')
    expect(html).toContain('info@tio2malaysia.com')
    expect(html).not.toMatch(/mailto:|tel:|WhatsApp/iu)
    expect(html).toContain('href="/request-a-quote/"')
    expect(html).toContain('href="/request-documents/"')
    expect(html).toContain('href="/request-sample/"')
    expect(html).toContain('href="/privacy-policy/"')
    expect(html).toContain('aria-current="page"')
    expect(html.indexOf('General contact details')).toBeLessThan(html.indexOf('Choose a dedicated request when you need one'))
    expect(html.indexOf('Choose a dedicated request when you need one')).toBeLessThan(html.indexOf('Send a general inquiry'))
  })

  it('omits a restricted fact and the sentence that refers to the complete fact set', () => {
    const html = renderToStaticMarkup(<MalaysiaContactPage page={toMalaysiaContactPageDto(malaysiaContactPageSource({mutateFact: 'manufacturingSite'}))} form={null} />)
    expect(html).not.toContain('Manufacturing Site')
    expect(html).not.toContain('NO.33 Industrial')
    expect(html).not.toContain('You can also find the General Inquiries email')
    expect(html).toContain('General Inquiries')
    expect(html).toContain('Operating Company')
    expect(html).not.toMatch(/placeholder|not available|coming soon/iu)
  })
})
