import {describe, expect, it} from 'vitest'

import {buildMalaysiaResourceProcMetadata} from '@/lib/seo/resource-proc-metadata'
import {getSiteConfig} from '@/sites'
import {malaysiaResourceProcDto} from '@/tests/fixtures/tio2-my-resource-proc'

describe('RES-PROC metadata', () => {
  it('uses exact locked metadata and remains noindex even in production', () => {
    const metadata = buildMalaysiaResourceProcMetadata(
      getSiteConfig('tio2-my'),
      malaysiaResourceProcDto(),
      {VERCEL_ENV: 'production', NEXT_PUBLIC_ENABLE_INDEXING: 'true'},
    )

    expect(metadata).toMatchObject({
      title: 'Chloride vs Sulfate Titanium Dioxide | Buyer Guide',
      description: 'Compare chloride and sulfate titanium dioxide routes, learn what route labels can indicate, and identify the grade-level evidence buyers still need to check.',
      alternates: {canonical: 'https://tio2malaysia.com/resources/chloride-vs-sulfate-titanium-dioxide/'},
      robots: {index: false, follow: false},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
    expect(JSON.stringify(metadata)).not.toMatch(/tio2products|tio2hub|pt-BR/iu)
  })

  it('rejects a non-Malaysia site binding', () => {
    expect(() => buildMalaysiaResourceProcMetadata(
      getSiteConfig('tio2-a'),
      malaysiaResourceProcDto(),
    )).toThrow(/tio2-my/u)
  })
})
