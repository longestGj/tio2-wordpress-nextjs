import {buildSchema, isObjectType} from 'graphql'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const schemaPath = fileURLToPath(
  new URL('../../wordpress/schema.graphql', import.meta.url),
)

const loadSchema = () => buildSchema(readFileSync(schemaPath, 'utf8'))

describe('Site A Product shared-settings GraphQL schema', () => {
  it('exposes the nullable Site A settings root with one required site ID', () => {
    const schema = loadSchema()
    const rootQuery = schema.getQueryType()
    const field = rootQuery?.getFields().tio2ProductSettings

    expect(field, 'RootQuery.tio2ProductSettings is missing').toBeDefined()
    expect(String(field!.type)).toBe('Tio2ProductSettings')
    expect(field!.args.map(({name, type}) => [name, String(type)])).toEqual([
      ['siteId', 'String!'],
    ])
  })

  it('keeps every approved settings field and nested scalar non-null', () => {
    const schema = loadSchema()
    const settings = schema.getType('Tio2ProductSettings')
    const inquiryField = schema.getType('Tio2InquiryField')
    const cta = schema.getType('Tio2Cta')

    expect(isObjectType(settings)).toBe(true)
    expect(isObjectType(inquiryField)).toBe(true)
    expect(isObjectType(cta)).toBe(true)
    if (!isObjectType(settings) || !isObjectType(inquiryField) || !isObjectType(cta)) {
      throw new Error('Product settings GraphQL types are incomplete')
    }

    expect(
      Object.fromEntries(
        Object.entries(settings.getFields()).map(([name, field]) => [name, String(field.type)]),
      ),
    ).toEqual({
      inquiryFields: '[Tio2InquiryField!]!',
      requestTdsCta: 'Tio2Cta!',
      discussApplicationCta: 'Tio2Cta!',
      technicalDisclaimer: 'String!',
    })
    expect(
      Object.fromEntries(
        Object.entries(inquiryField.getFields()).map(([name, field]) => [name, String(field.type)]),
      ),
    ).toEqual({key: 'String!', label: 'String!', guidance: 'String!'})
    expect(
      Object.fromEntries(
        Object.entries(cta.getFields()).map(([name, field]) => [name, String(field.type)]),
      ),
    ).toEqual({label: 'String!', description: 'String!'})
  })

  it('does not expose private, legal, or direct-download settings', () => {
    const schema = loadSchema()
    const settings = schema.getType('Tio2ProductSettings')
    expect(isObjectType(settings)).toBe(true)
    if (!isObjectType(settings)) {
      throw new Error('Tio2ProductSettings is not an object type')
    }

    for (const forbiddenField of [
      'tdsUrl',
      'downloadUrl',
      'sourceModel',
      'lastReviewed',
      'reviewer',
      'manufacturer',
      'legalEntity',
    ]) {
      expect(settings.getFields()[forbiddenField]).toBeUndefined()
    }
  })
})
