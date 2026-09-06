import {render, screen} from '@testing-library/react'
import {createHash} from 'node:crypto'
import {describe, expect, it} from 'vitest'

import {MalaysiaLegalPage} from '@/components/sites/tio2-my/legal/malaysia-legal-page'
import {parseLegalMarkdown} from '@/lib/legal/markdown'
import {toMalaysiaLegalPagesDto} from '@/lib/wordpress/legal-pages-v01-dto'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

const buyerVisibleSha256 = {
  'LEGAL-PRIV-EN': '143242D903FD9AA09D8C170340BA06211803BB35A7207269B955D63A328E22AA',
  'LEGAL-PRIV-MS': 'B47CEB633A0517544469EF3047726522A281D594C3403546F771D375D993AB49',
  'LEGAL-COOKIE-EN': '0288B9B67600517D579FFDF773A78A07AE143A034177B3275C82137B29E5C3B5',
} as const

const privacySourceAuthority = {
  'LEGAL-PRIV-EN': {
    effectiveDate: '2026-09-05',
    sourceFile: 'LEGAL-PRIV-EN_GATE2_FULL_COPY_V0.2.md',
    sourceSha256: '896A4CBCEE2CF5A9B19C9B65B62B7C247668A3C5C84DA17E0E61CB0B8E556A37',
  },
  'LEGAL-PRIV-MS': {
    effectiveDate: '2026-09-05',
    sourceFile: 'LEGAL-PRIV-MS_GATE2_FULL_COPY_V0.2.md',
    sourceSha256: '00FB18D246D7FFEA787CDB9BE06EF3B74D547607D62F4E846EFBF2DD0E4FB594',
  },
} as const

function requestDocumentsDisclosure(markdown: string, start: string, end: string) {
  const startIndex = markdown.indexOf(start)
  const endIndex = markdown.indexOf(end, startIndex + start.length)
  expect(startIndex).toBeGreaterThanOrEqual(0)
  expect(endIndex).toBeGreaterThan(startIndex)
  return markdown.slice(startIndex + start.length, endIndex).trim()
}

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

  it('binds both Privacy policies to the approved V0.2 source authorities', () => {
    expect(Object.fromEntries(approved.pages.filter((page) => page.pageId.startsWith('LEGAL-PRIV-')).map((page) => [
      page.pageId,
      {effectiveDate: page.effectiveDate, sourceFile: page.sourceFile, sourceSha256: page.sourceSha256},
    ]))).toEqual(privacySourceAuthority)
  })

  it('discloses exactly the eight active Request Documents fields and no excluded fields', () => {
    const [privacyEn, privacyMs] = approved.pages
    const enDisclosure = requestDocumentsDisclosure(
      privacyEn!.buyerVisibleMarkdown,
      'When you submit a Request Documents form, we collect:',
      'Where applicable,',
    )
    const msDisclosure = requestDocumentsDisclosure(
      privacyMs!.buyerVisibleMarkdown,
      'Apabila anda menghantar borang Request Documents, kami mengumpul:',
      'Apabila berkenaan,',
    )

    expect(enDisclosure.split('\n').filter((line) => line.startsWith('- '))).toEqual([
      '- Full Name;', '- Company;', '- Business Email;', '- Country/Region;', '- Product Grade;',
      '- the selected Document Types;', '- Application/Industry, if supplied; and',
      '- Additional Requirements, if supplied.',
    ])
    expect(msDisclosure.split('\n').filter((line) => line.startsWith('- '))).toEqual([
      '- Nama Penuh;', '- Syarikat;', '- E-mel Perniagaan;', '- Negara/Rantau;', '- Gred Produk;',
      '- Jenis Dokumen yang dipilih;', '- Aplikasi/Industri, jika diberikan; dan',
      '- Keperluan Tambahan, jika diberikan.',
    ])
    expect(enDisclosure).not.toMatch(/upload|phone|whatsapp|website|market|destination/iu)
    expect(msDisclosure).not.toMatch(/muat naik|telefon|whatsapp|laman web|pasaran|destinasi/iu)
  })

  it('states the approved Web3Forms browser-direct and non-guarantee boundaries in both languages', () => {
    const [privacyEn, privacyMs] = approved.pages.map((page) => page.buyerVisibleMarkdown)
    expect(privacyEn).toContain('Quotation and document-request submissions are transmitted through **Web3Forms**')
    expect(privacyEn).toContain('the browser submits directly to the fixed Web3Forms endpoint under the Free plan')
    expect(privacyEn).toContain('not a mailbox password or private secret')
    expect(privacyEn).toContain('does not confirm that a requested document exists, applies to a particular product or situation, or will be provided or sent')
    expect(privacyEn).toContain('If we later introduce a sample-request form with an active production receiver')
    expect(privacyEn).not.toContain('If we later introduce sample or document-request forms')

    expect(privacyMs).toContain('Penghantaran sebut harga dan permintaan dokumen dihantar melalui **Web3Forms**')
    expect(privacyMs).toContain('pelayar menghantar terus ke titik akhir Web3Forms tetap di bawah Pelan Percuma')
    expect(privacyMs).toContain('bukannya kata laluan peti mel atau rahsia peribadi')
    expect(privacyMs).toContain('tidak mengesahkan bahawa dokumen yang diminta wujud, terpakai kepada produk atau keadaan tertentu, atau akan diberikan atau dihantar')
    expect(privacyMs).toContain('Jika kami memperkenalkan borang permintaan sampel dengan penerima produksi yang aktif pada masa hadapan')
    expect(privacyMs).not.toContain('borang permintaan sampel atau dokumen')

    expect(`${privacyEn}\n${privacyMs}`).not.toMatch(/NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY|access_key\s*[:=]/u)
    const renderedEmails = new Set(`${privacyEn}\n${privacyMs}`.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu)?.map((email) => email.toLowerCase()) ?? [])
    expect(
      renderedEmails.size === 1 && renderedEmails.has('info@tio2malaysia.com'),
      'approved Buyer-visible copy must contain no provider-bound recipient identity',
    ).toBe(true)
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

  it('marks the shared English chrome inside the Bahasa Malaysia page', () => {
    const page = toMalaysiaLegalPagesDto(source())[1]!
    const {container} = render(<MalaysiaLegalPage page={page} />)

    expect(container.querySelector('main')?.getAttribute('lang')).toBe('ms-MY')
    expect(container.querySelector('header')?.getAttribute('lang')).toBe('en')
    expect(container.querySelector('footer')?.getAttribute('lang')).toBe('en')
  })
})
/** @vitest-environment jsdom */
