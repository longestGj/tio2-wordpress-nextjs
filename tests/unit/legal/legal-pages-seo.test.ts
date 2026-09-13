import {describe, expect, it} from 'vitest'

import {buildMalaysiaLegalPageJsonLd, serializeMalaysiaLegalPageJsonLd} from '@/lib/seo/legal-page-jsonld'
import {buildMalaysiaLegalPageMetadata} from '@/lib/seo/legal-page-metadata'
import {getSiteConfig} from '@/sites'
import {toMalaysiaLegalPagesDto} from '@/lib/wordpress/legal-pages-v01-dto'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

const sources = approved.pages.map((page, index) => ({
  id: `legal-${index + 1}`, modifiedGmt: '2026-09-02T08:00:00', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: page.path.replace(/\/$/, '')},
  malaysiaLegalPageContractJson: JSON.stringify(page),
}))

function sourcesWithDeliveredSeo() {
  const seoByPageId = {
    'LEGAL-PRIV-EN': {title: 'Updated privacy policy', description: 'Published English description.', effectiveDate: '2026-09-14'},
    'LEGAL-PRIV-MS': {title: 'Dasar privasi dikemas kini', description: 'Penerangan Bahasa Malaysia diterbitkan.', effectiveDate: '2026-09-15'},
    'LEGAL-COOKIE-EN': {title: 'Updated cookie policy', description: 'Published cookie description.', effectiveDate: '2026-09-16'},
  } as const
  return sources.map((record, index) => ({
    ...record,
    malaysiaLegalPageContractJson: JSON.stringify({
      ...approved.pages[index]!,
      effectiveDate: seoByPageId[approved.pages[index]!.pageId as keyof typeof seoByPageId].effectiveDate,
      seo: {
        ...approved.pages[index]!.seo,
        title: seoByPageId[approved.pages[index]!.pageId as keyof typeof seoByPageId].title,
        description: seoByPageId[approved.pages[index]!.pageId as keyof typeof seoByPageId].description,
      },
    }),
  }))
}

describe('Legal page metadata and Schema', () => {
  it('activates one exact GA4/GTM legal state across English, BM and Cookie surfaces', () => {
    expect(approved.releaseState).toBe('verified_google_analytics_active')
    expect(approved.releaseControls.optionalAnalyticsAuthorized).toBe(true)
    expect(new Set(approved.pages.map((page) => page.releaseState))).toEqual(new Set(['verified_google_analytics_active']))
    expect(new Set(approved.pages.map((page) => page.effectiveDate))).toEqual(new Set(['2026-09-13']))

    const [en, bm, cookie] = approved.pages.map((page) => page.buyerVisibleMarkdown)
    for (const copy of [en, bm, cookie]) {
      expect(copy).toContain('Google Analytics')
      expect(copy).toContain('Google Tag Manager')
      expect(copy).not.toMatch(/No optional Analytics technology is active|tidak dianggap sebagai perkhidmatan aktif|not currently active/iu)
    }
    expect(en).toContain('We do not send names, email addresses, telephone numbers, company names, free-text inquiry content or form submissions to Google Analytics.')
    expect(bm).toContain('Kami tidak menghantar nama, alamat e-mel, nombor telefon, nama syarikat, kandungan pertanyaan dalam teks bebas atau penghantaran borang kepada Google Analytics.')
    expect(cookie).toContain('`tio2_my_consent_v1`')
    expect(cookie).toContain('`_ga_QDHLMRH2WB`')
    expect(cookie).not.toMatch(/\[FINAL_|\[GATE_|\[PROPERTY_/u)
  })

  it('emits exact canonical and reciprocal Privacy hreflang while preview stays noindex', () => {
    const [en, ms, cookie] = toMalaysiaLegalPagesDto(sources)
    const site = getSiteConfig('tio2-my')
    const enMeta = buildMalaysiaLegalPageMetadata(site, en!, {})
    expect(enMeta.alternates).toEqual({canonical: en!.seo.canonical, languages: {
      en: 'https://tio2malaysia.com/privacy-policy/',
      'ms-MY': 'https://tio2malaysia.com/ms/privacy-policy/',
      'x-default': 'https://tio2malaysia.com/privacy-policy/',
    }})
    expect(enMeta.robots).toEqual({index: false, follow: false})
    expect(buildMalaysiaLegalPageMetadata(site, ms!, {}).description).toBe('Ketahui cara TiO2 Malaysia mengendalikan data pertanyaan perniagaan, penyedia perkhidmatan, tempoh penyimpanan, kuki dan pilihan privasi yang berkenaan.')
    expect(buildMalaysiaLegalPageMetadata(site, cookie!, {}).alternates).toEqual({canonical: cookie!.seo.canonical})
  })

  it('projects delivered multilingual SEO text without changing publication controls', () => {
    const [en, ms, cookie] = toMalaysiaLegalPagesDto(sourcesWithDeliveredSeo())
    const site = getSiteConfig('tio2-my')
    const enMeta = buildMalaysiaLegalPageMetadata(site, en!, {})

    expect(enMeta.title).toBe('Updated privacy policy')
    expect(enMeta.description).toBe('Published English description.')
    expect(enMeta.robots).toEqual({index: false, follow: false})
    expect(enMeta.alternates).toEqual({canonical: en!.seo.canonical, languages: {
      en: 'https://tio2malaysia.com/privacy-policy/',
      'ms-MY': 'https://tio2malaysia.com/ms/privacy-policy/',
      'x-default': 'https://tio2malaysia.com/privacy-policy/',
    }})
    expect(enMeta.openGraph).toMatchObject({
      type: 'website', url: en!.seo.canonical, siteName: 'TiO2 Malaysia',
      title: 'Updated privacy policy', description: 'Published English description.', images: [],
    })
    expect(enMeta.twitter).toEqual({
      card: 'summary', title: 'Updated privacy policy', description: 'Published English description.', images: [],
    })
    expect(buildMalaysiaLegalPageMetadata(site, ms!, {})).toMatchObject({
      title: 'Dasar privasi dikemas kini', description: 'Penerangan Bahasa Malaysia diterbitkan.',
    })
    expect(buildMalaysiaLegalPageMetadata(site, cookie!, {}).alternates).toEqual({canonical: cookie!.seo.canonical})
  })

  it('emits only visible-copy-equivalent WebPage and BreadcrumbList nodes', () => {
    const pages = toMalaysiaLegalPagesDto(sources)
    const expected = [
      {inLanguage: 'en', dateModified: '2026-09-13'},
      {inLanguage: 'ms-MY', dateModified: '2026-09-13'},
      {inLanguage: 'en', dateModified: '2026-09-13'},
    ]
    pages.forEach((page, index) => {
      const graph = buildMalaysiaLegalPageJsonLd(getSiteConfig('tio2-my'), page)['@graph'] as Array<Record<string, unknown>>
      expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
      expect(graph[0]).toMatchObject(expected[index])
      expect(JSON.stringify(graph)).not.toMatch(/FAQPage|Article|LegalService|TermsOfService/)
    })
  })

  it('serializes changed delivered CMS title, description and date into every legal WebPage', () => {
    const pages = toMalaysiaLegalPagesDto(sourcesWithDeliveredSeo())
    const expected = [
      {name: 'Updated privacy policy', description: 'Published English description.', dateModified: '2026-09-14'},
      {name: 'Dasar privasi dikemas kini', description: 'Penerangan Bahasa Malaysia diterbitkan.', dateModified: '2026-09-15'},
      {name: 'Updated cookie policy', description: 'Published cookie description.', dateModified: '2026-09-16'},
    ]
    pages.forEach((page, index) => {
      const graph = JSON.parse(serializeMalaysiaLegalPageJsonLd(buildMalaysiaLegalPageJsonLd(getSiteConfig('tio2-my'), page)))['@graph'] as Array<Record<string, unknown>>
      expect(graph[0]).toMatchObject(expected[index]!)
    })
  })
})
