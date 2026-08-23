import {describe, expect, it} from 'vitest'

import {buildPageJsonLd, serializeJsonLd} from '@/lib/seo/jsonld'
import {buildPageMetadata} from '@/lib/seo/metadata'
import {toContentPageDto} from '@/lib/wordpress/dto'
import {getSiteConfig} from '@/sites'
import {makeContentPageNode} from '@/tests/mocks/handlers'

function contentPage(
  content: string,
  seoDescription = '',
) {
  return toContentPageDto(
    makeContentPageNode({
      content,
      publishingFields: {
        __typename: 'PublishingFields',
        publicPath: '/applications/coatings',
        seoTitle: 'Coatings',
        seoDescription,
      },
    }),
    'tio2-a',
    '/applications/coatings',
  )
}

describe('single-pass SEO text pipeline', () => {
  it('preserves decoded technical comparison text from DTO through metadata and JSON-LD', () => {
    const page = contentPage(
      '<p>size &lt; 5 µm and brightness &gt; 95%</p>',
    )

    expect(page.excerpt).toBe('size < 5 µm and brightness > 95%')
    expect(buildPageMetadata(getSiteConfig('tio2-a'), page).description).toBe(
      'size < 5 µm and brightness > 95%',
    )
    expect(
      buildPageJsonLd(getSiteConfig('tio2-a'), page).at(-1)?.description,
    ).toBe('size < 5 µm and brightness > 95%')
  })

  it('sanitizes hostile content once while preserving harmless literal angle brackets', () => {
    const page = contentPage(
      '<style>.secret{display:block}</style><!-- hidden --><p>Visible &lt;technical&gt; text.</p><script>alert(1)</script><img src=x onerror=alert(2)>',
    )
    const metadata = buildPageMetadata(getSiteConfig('tio2-a'), page)
    const graph = buildPageJsonLd(getSiteConfig('tio2-a'), page)
    const serialized = serializeJsonLd(graph)

    expect(page.excerpt).toBe('Visible <technical> text.')
    expect(metadata.description).toBe('Visible <technical> text.')
    expect(graph.at(-1)?.description).toBe('Visible <technical> text.')
    expect(serialized).not.toContain('<')
    expect(serialized).not.toContain('alert(1)')
    expect(serialized).not.toContain('alert(2)')
    expect(serialized).not.toContain('secret')
    expect(serialized).not.toContain('hidden')
  })

  it('sanitizes CMS SEO description once and never reinterprets decoded text', () => {
    const page = contentPage(
      '<p>Fallback content.</p>',
      '<strong>size</strong> &lt; 5 µm and brightness &gt; 95%<script>alert(1)</script>',
    )

    expect(page.seo.description).toBe('size < 5 µm and brightness > 95%')
    expect(buildPageMetadata(getSiteConfig('tio2-a'), page).description).toBe(
      'size < 5 µm and brightness > 95%',
    )
    expect(
      buildPageJsonLd(getSiteConfig('tio2-a'), page).at(-1)?.description,
    ).toBe('size < 5 µm and brightness > 95%')
  })

  it('sanitizes a site default exactly once as its own input contract', () => {
    const configured = getSiteConfig('tio2-a')
    const site = {
      ...configured,
      defaultSeo: {
        ...configured.defaultSeo,
        description:
          '<b>Default size</b> &lt; 5 µm<script>alert(1)</script>',
      },
    }
    const page = contentPage('')

    expect(buildPageMetadata(site, page).description).toBe(
      'Default size < 5 µm',
    )
    expect(buildPageJsonLd(site, page).at(-1)?.description).toBe(
      'Default size < 5 µm',
    )
  })
})
