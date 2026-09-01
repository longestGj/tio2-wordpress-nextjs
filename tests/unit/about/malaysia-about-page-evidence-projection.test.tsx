import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaAboutPage} from '@/components/sites/tio2-my/about/malaysia-about-page'
import {buildMalaysiaAboutPageJsonLd} from '@/lib/seo/about-page-jsonld'
import {buildMalaysiaAboutPageMetadata} from '@/lib/seo/about-page-metadata'
import {toMalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaAboutPageSource} from '@/tests/fixtures/tio2-my-about-page'

function outputs(
  state: 'partial' | 'restricted',
  authorizations: Readonly<Record<string, 'restricted' | 'not_public'>>,
) {
  const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource({
    evidenceState: state,
    authorizations,
  }))
  return {
    dto,
    html: renderToStaticMarkup(<MalaysiaAboutPage aboutPage={dto} />),
    metadata: JSON.stringify(buildMalaysiaAboutPageMetadata(getSiteConfig('tio2-my'), dto, {})),
    schema: JSON.stringify(buildMalaysiaAboutPageJsonLd(getSiteConfig('tio2-my'), dto)),
  }
}

describe('ABOUT-001 field-level evidence projection', () => {
  it('removes an independently restricted export fact from HTML, metadata and Schema', () => {
    const result = outputs('partial', {'export.port': 'restricted'})
    for (const output of [result.html, result.metadata, result.schema]) {
      expect(output).not.toContain('Port Klang')
    }
    expect(result.html).not.toContain('Export Coordination')
    expect(result.html).not.toMatch(/portScene|routeMap|marketMap/u)
    expect(result.html).toContain('More than 35,000 metric tons')
  })

  it('removes independently restricted area and location facts without orphan visuals', () => {
    const result = outputs('partial', {
      'areas.served': 'restricted',
      'location.full': 'restricted',
    })
    for (const output of [result.html, result.metadata, result.schema]) {
      expect(output).not.toMatch(/Taiping|Perak|European Union|United Kingdom|Brazil/iu)
    }
    expect(result.html).toContain('<h1>About TiO2 Malaysia</h1>')
    expect(result.html).not.toMatch(/heroBag|portScene|routeMap|marketMap/u)
  })

  it('treats not_public document support as absent in every output', () => {
    const result = outputs('partial', {'documents.support': 'not_public'})
    for (const output of [result.html, result.metadata, result.schema]) {
      expect(output).not.toMatch(/TDS, SDS, COA, COO|Technical Documentation Support|Documentation Before Procurement/iu)
    }
    expect(result.html).not.toContain('data-module="documentation"')
    expect(result.html).toContain('data-module="applications"')
  })

  it('accepts multiple arbitrary authorizations and renders only the restricted safe surface', () => {
    const result = outputs('restricted', {
      'organization.name': 'not_public',
      'export.port': 'restricted',
      'compliance.support': 'not_public',
      'areas.served': 'restricted',
    })
    for (const output of [result.html, result.metadata, result.schema]) {
      expect(output).not.toMatch(/IKHLAS|Port Klang|REACH|European Union|Taiping/iu)
    }
    expect(result.html).toContain('<h1>About TiO2 Malaysia</h1>')
    expect(result.html).toContain('Rutile titanium dioxide grades')
    expect(result.html).toContain('data-module="final-cta"')
    expect(result.html).toContain('href="/request-a-quote/"')
    expect(result.html).not.toMatch(/heroBag|portScene|routeMap|marketMap|industrialStructure/u)
    expect(JSON.parse(result.schema)['@graph'].map((node: {'@type': string}) => node['@type'])).toEqual([
      'AboutPage', 'Brand', 'BreadcrumbList',
    ])
  })
})
