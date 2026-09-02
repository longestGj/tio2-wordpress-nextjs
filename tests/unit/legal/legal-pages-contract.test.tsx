import {render, screen} from '@testing-library/react'
import {createHash} from 'node:crypto'
import {describe, expect, it} from 'vitest'

import {MalaysiaLegalPage} from '@/components/sites/tio2-my/legal/malaysia-legal-page'
import {parseLegalMarkdown} from '@/lib/legal/markdown'
import {toMalaysiaLegalPagesDto} from '@/lib/wordpress/legal-pages-v01-dto'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

const buyerVisibleSha256 = {
  'LEGAL-PRIV-EN': '8F5C4BEA246FB36EB857D8DB7FFFE011DA7321BE67DEEB0AC1695B11CC98F8B0',
  'LEGAL-PRIV-MS': 'E19942101B0F3037A899219D5737A6F6F59C0BA6D611DEBC7ADD52EBEEDAC876',
  'LEGAL-COOKIE-EN': '0288B9B67600517D579FFDF773A78A07AE143A034177B3275C82137B29E5C3B5',
} as const

function source(scope = 'tio2-my') {
  return approved.pages.map((page, index) => ({
    id: `legal-${index + 1}`,
    modifiedGmt: '2026-09-02T08:00:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: scope}]},
    publishingFields: {publicPath: page.path.replace(/\/$/, '')},
    malaysiaLegalPageContractJson: JSON.stringify(page),
  }))
}

describe('Legal/Privacy approved page contract', () => {
  it('projects only the three exact same-scope page identities', () => {
    const pages = toMalaysiaLegalPagesDto(source())
    expect(pages.map((page) => [page.pageId, page.path, page.locale])).toEqual([
      ['LEGAL-PRIV-EN', '/privacy-policy/', 'en'],
      ['LEGAL-PRIV-MS', '/ms/privacy-policy/', 'ms-MY'],
      ['LEGAL-COOKIE-EN', '/cookie-policy/', 'en'],
    ])
    expect(() => toMalaysiaLegalPagesDto(source('tio2-a'))).toThrow(/site_scope=tio2-my/)
    expect(() => toMalaysiaLegalPagesDto(source().slice(0, 2))).toThrow(/records\.cardinality/)
    expect(() => toMalaysiaLegalPagesDto([...source(), source()[0]!])).toThrow(/records\.cardinality/)
  })

  it('parses exact buyer-visible boundaries and ordered section counts', () => {
    const [privacyEn, privacyMs, cookie] = approved.pages.map((page) => parseLegalMarkdown(page.buyerVisibleMarkdown))
    expect([privacyEn.h1, privacyMs.h1, cookie.h1]).toEqual(['Privacy Policy', 'Dasar Privasi', 'Cookie Policy'])
    expect([privacyEn.sections.length, privacyMs.sections.length, cookie.sections.length]).toEqual([10, 10, 7])
    expect(privacyEn.sections.map((section) => section.heading)).toEqual([
      'Who We Are', 'Information We Collect', 'How We Use Information',
      'Service Providers and International Processing', 'How Long We Keep Information',
      'Cookies and Analytics', 'Your Rights and Choices', 'Security and Data Minimisation',
      'Business Users and Children', 'Changes and Contact',
    ])
    expect(cookie.raw).not.toContain('Conditional buyer-visible replacement')
    expect(cookie.raw).not.toContain('Internal release controls')
    expect(cookie.raw).toContain('No optional Analytics technology is active')
  })

  it('pins every complete Buyer-visible projection independently of the mutable config', () => {
    expect(Object.fromEntries(approved.pages.map((page) => [
      page.pageId,
      createHash('sha256').update(page.buyerVisibleMarkdown, 'utf8').digest('hex').toUpperCase(),
    ]))).toEqual(buyerVisibleSha256)
  })

  it('renders initial legal copy, links and no false current navigation state', () => {
    const page = toMalaysiaLegalPagesDto(source())[0]!
    const {container} = render(<MalaysiaLegalPage page={page} />)
    expect(screen.getByRole('heading', {level: 1, name: 'Privacy Policy'})).toBeTruthy()
    expect(container.querySelectorAll('main h2')).toHaveLength(10)
    expect(screen.getByRole('link', {name: 'Bahasa Malaysia'}).getAttribute('href')).toBe('/ms/privacy-policy/')
    expect(screen.getAllByRole('button', {name: /manage cookie settings/i})).toHaveLength(2)
    expect(container.querySelector('header [aria-current="page"]')).toBeNull()
    expect(container.textContent).not.toMatch(/Internal release controls|Gate 8|Gate 9|TBD/)
  })
})
/** @vitest-environment jsdom */
