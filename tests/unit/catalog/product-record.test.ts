import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {
  createProductRecordIndex,
  parseProductRecordYaml,
} from '@/lib/catalog/product-record'

const validRecord = `
schema_version: 1
product:
  id: tp-c120
  brand: TIOVAR
  model: TP-C120
  source_model: CR-510+
  family: rutile-titanium-dioxide
source_documents:
  - id: citic-cr-510-plus-tds
    filename: TDS-CR-510+.pdf
    sha256: bc07aa380576ab98280c8c4a35836946c9a13735b3fba9496a203bcce8272700
    issuer: CITIC Titanium Industry Co., Ltd.
specifications:
  - key: titanium-dioxide-content
    label: TiO2 content
    value: 95
    unit: percent
    source_document_id: citic-cr-510-plus-tds
claims:
  - key: crystal-form
    text: Rutile titanium dioxide pigment.
    kind: source_fact
    verification: source_confirmed
    source_document_id: citic-cr-510-plus-tds
`

describe('parseProductRecordYaml', () => {
  it('parses a source-traceable product record', () => {
    const record = parseProductRecordYaml(validRecord)

    expect(record.product).toEqual({
      id: 'tp-c120',
      brand: 'TIOVAR',
      model: 'TP-C120',
      source_model: 'CR-510+',
      family: 'rutile-titanium-dioxide',
    })
    expect(record.specifications[0]).toMatchObject({
      key: 'titanium-dioxide-content',
      value: 95,
      unit: 'percent',
      source_document_id: 'citic-cr-510-plus-tds',
    })
  })

  it('rejects specification units outside the catalog vocabulary', () => {
    const record = validRecord.replace('unit: percent', 'unit: percentage')

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('rejects a specification that references an unknown source document', () => {
    const record = validRecord.replace(
      'source_document_id: citic-cr-510-plus-tds',
      'source_document_id: missing-source',
    )

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('rejects a product record without a source document', () => {
    const record = `
schema_version: 1
product:
  id: tp-c120
  brand: TIOVAR
  model: TP-C120
  source_model: CR-510+
  family: rutile-titanium-dioxide
source_documents: []
specifications: []
claims: []
`

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('rejects duplicate specification keys', () => {
    const duplicate = `  - key: titanium-dioxide-content
    label: Duplicate TiO2 content
    value: 94
    unit: percent
    source_document_id: citic-cr-510-plus-tds
`
    const record = validRecord.replace('claims:', `${duplicate}claims:`)

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('rejects research fields outside the approved product contract', () => {
    const record = `${validRecord}\nkeywords:\n  - titanium dioxide supplier\n`

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it.each([
    [
      'product',
      validRecord.replace(
        'family: rutile-titanium-dioxide',
        'family: rutile-titanium-dioxide\n  competitor_model: unapproved-value',
      ),
    ],
    [
      'source document',
      validRecord.replace(
        'issuer: CITIC Titanium Industry Co., Ltd.',
        'issuer: CITIC Titanium Industry Co., Ltd.\n    market_rank: 1',
      ),
    ],
    [
      'specification',
      validRecord.replace(
        'unit: percent',
        'unit: percent\n    search_volume: 1000',
      ),
    ],
    [
      'claim',
      validRecord.replace(
        'verification: source_confirmed',
        'verification: source_confirmed\n    equivalent_to: unapproved-value',
      ),
    ],
  ])('rejects unapproved fields inside a %s', (_section, record) => {
    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('rejects a product ID that is not stable lowercase kebab-case', () => {
    const record = validRecord.replace('id: tp-c120', 'id: TP C120')

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('rejects a source document without a lowercase SHA-256 hash', () => {
    const record = validRecord.replace(
      'bc07aa380576ab98280c8c4a35836946c9a13735b3fba9496a203bcce8272700',
      'not-a-sha256',
    )

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('stores a source filename without coupling runtime data to an external path', () => {
    const record = validRecord.replace(
      'filename: TDS-CR-510+.pdf',
      'filename: ../TDS-CR-510+.pdf',
    )

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('rejects a source fact that does not cite its source document', () => {
    const record = validRecord.replace(
      '    verification: source_confirmed\n    source_document_id: citic-cr-510-plus-tds',
      '    verification: source_confirmed',
    )

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('rejects a source fact that is still marked unverified', () => {
    const record = validRecord.replace(
      'verification: source_confirmed',
      'verification: unverified',
    )

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('rejects an unknown claim verification status', () => {
    const record = validRecord
      .replace('kind: source_fact', 'kind: tiovar_copy')
      .replace('verification: source_confirmed', 'verification: approved')

    expect(() => parseProductRecordYaml(record)).toThrow()
  })

  it('parses the canonical TP-C120 record with all source specifications', () => {
    const source = readFileSync(
      resolve('content/products/tp-c120/record.yaml'),
      'utf8',
    )
    const record = parseProductRecordYaml(source)

    expect(record.product).toEqual({
      id: 'tp-c120',
      brand: 'TIOVAR',
      model: 'TP-C120',
      source_model: 'CR-510+',
      family: 'rutile-titanium-dioxide',
    })
    expect(record.source_documents).toEqual([
      {
        id: 'citic-cr-510-plus-tds',
        filename: 'TDS-CR-510+.pdf',
        sha256: 'bc07aa380576ab98280c8c4a35836946c9a13735b3fba9496a203bcce8272700',
        issuer: 'CITIC Titanium Industry Co., Ltd.',
      },
    ])
    expect(
      record.specifications.map(({key, value, unit}) => ({key, value, unit})),
    ).toEqual([
      {key: 'titanium-dioxide-content', value: 95, unit: 'percent'},
      {key: 'rutile-content', value: 99.9, unit: 'percent'},
      {key: 'dry-l-star', value: 99.4, unit: 'cie-l-star'},
      {key: 'dry-b-star', value: 1, unit: 'cie-b-star'},
      {
        key: 'specific-gravity',
        value: 4.1,
        unit: 'grams-per-cubic-centimeter',
      },
      {key: 'ph', value: 7.5, unit: 'ph'},
      {key: 'carbon-black-undertone', value: 14, unit: 'cbu'},
      {key: 'oil-absorption', value: 17, unit: 'grams-per-100-grams'},
      {key: 'mean-particle-size', value: 0.27, unit: 'micrometre'},
    ])
  })

  it('rejects duplicate product IDs when records are indexed', () => {
    const record = parseProductRecordYaml(validRecord)

    expect(() => createProductRecordIndex([record, record])).toThrow(
      'Duplicate product ID: tp-c120',
    )
  })
})
