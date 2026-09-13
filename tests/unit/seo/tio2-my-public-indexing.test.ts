import {describe, expect, it} from 'vitest'

import {buildRobots} from '@/app/robots'
import {buildSitemap} from '@/app/sitemap'
import {getTio2MyIndexablePages} from '@/lib/seo/tio2-my-publication-inventory'
import {buildTio2MyPublicationMetadata} from '@/lib/seo/tio2-my-publication-metadata'
import {getSiteConfig} from '@/sites'

describe('TiO2 Malaysia public crawler contract', () => {
  it('publishes exactly the 57 approved self-canonical URLs in the sitemap', async () => {
    const sitemap = await buildSitemap(getSiteConfig('tio2-my'))
    const urls = sitemap.map((entry) => entry.url)
    const expected = getTio2MyIndexablePages().map((page) => page.canonical)

    expect(urls).toEqual(expected)
    expect(new Set(urls).size).toBe(57)
    expect(urls).not.toContain('https://tio2malaysia.com/thank-you/')
    expect(urls.every((url) => !/[?#]/.test(url))).toBe(true)
    expect(sitemap.every((entry) => new Date(entry.lastModified!).toISOString() === '2026-09-13T00:00:00.000Z')).toBe(true)
  })

  it('keeps preview closed and exposes only public crawler surfaces in production', () => {
    const site = getSiteConfig('tio2-my')
    expect(buildRobots(site, {VERCEL_ENV: 'preview'}).rules).toEqual([
      {userAgent: '*', disallow: '/'},
    ])
    expect(buildRobots(site, {VERCEL_ENV: 'production'})).toEqual({
      rules: [{userAgent: '*', allow: '/', disallow: ['/api/', '/preview/']}],
      host: 'https://tio2malaysia.com',
      sitemap: 'https://tio2malaysia.com/sitemap.xml',
    })
  })

  it('projects every routable object to its exact approved metadata', () => {
    for (const page of getTio2MyIndexablePages()) {
      const metadata = buildTio2MyPublicationMetadata(page.pageId, {VERCEL_ENV: 'production'})
      expect(metadata.title).toBe(page.title)
      expect(metadata.description).toBe(page.metaDescription)
      expect(metadata.alternates?.canonical).toBe(page.canonical)
      expect(metadata.robots).toEqual({index: true, follow: true})
    }
  })

  it('emits reciprocal hreflang only for approved locale pairs', () => {
    expect(buildTio2MyPublicationMetadata('MARKET-BR-EN', {VERCEL_ENV: 'production'}).alternates?.languages).toEqual({
      en: 'https://tio2malaysia.com/markets/brazil/',
      'pt-BR': 'https://tio2malaysia.com/pt-br/markets/brazil/',
      'x-default': 'https://tio2malaysia.com/markets/brazil/',
    })
    expect(buildTio2MyPublicationMetadata('LEGAL-PRIV-MS', {VERCEL_ENV: 'production'}).alternates?.languages).toEqual({
      en: 'https://tio2malaysia.com/privacy-policy/',
      'ms-MY': 'https://tio2malaysia.com/ms/privacy-policy/',
      'x-default': 'https://tio2malaysia.com/privacy-policy/',
    })
  })
})
