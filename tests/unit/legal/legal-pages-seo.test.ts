import {describe, expect, it} from 'vitest'

import {buildMalaysiaLegalPageJsonLd} from '@/lib/seo/legal-page-jsonld'
import {buildMalaysiaLegalPageMetadata} from '@/lib/seo/legal-page-metadata'
import {getSiteConfig} from '@/sites'
import {toMalaysiaLegalPagesDto} from '@/lib/wordpress/legal-pages-v01-dto'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

const sources = approved.pages.map((page, index) => ({
  id: `legal-${index + 1}`, modifiedGmt: '2026-09-02T08:00:00', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: page.path.replace(/\/$/, '')},
  malaysiaLegalPageContractJson: JSON.stringify(page),
}))

describe('Legal page metadata and Schema', () => {
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
    expect(buildMalaysiaLegalPageMetadata(site, ms!, {}).description).toBe(approved.pages[1]!.seo.description)
    expect(buildMalaysiaLegalPageMetadata(site, cookie!, {}).alternates).toEqual({canonical: cookie!.seo.canonical})
  })

  it('emits only visible-copy-equivalent WebPage and BreadcrumbList nodes', () => {
    const pages = toMalaysiaLegalPagesDto(sources)
    const expected = [
      {inLanguage: 'en', dateModified: '2026-09-05'},
      {inLanguage: 'ms-MY', dateModified: '2026-09-05'},
      {inLanguage: 'en', dateModified: '2026-09-02'},
    ]
    pages.forEach((page, index) => {
      const graph = buildMalaysiaLegalPageJsonLd(getSiteConfig('tio2-my'), page)['@graph'] as Array<Record<string, unknown>>
      expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
      expect(graph[0]).toMatchObject(expected[index])
      expect(JSON.stringify(graph)).not.toMatch(/FAQPage|Article|LegalService|TermsOfService/)
    })
  })
})
