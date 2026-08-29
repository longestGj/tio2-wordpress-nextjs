import {buildSchema, isObjectType} from 'graphql'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const schemaPath = fileURLToPath(
  new URL('../../wordpress/schema.graphql', import.meta.url),
)

const loadSchema = () => buildSchema(readFileSync(schemaPath, 'utf8'))

const fieldShapes = (schema: ReturnType<typeof loadSchema>, typeName: string) => {
  const type = schema.getType(typeName)
  expect(isObjectType(type), `${typeName} must be an object type`).toBe(true)
  if (!isObjectType(type)) {
    throw new Error(`${typeName} is missing`)
  }
  return Object.fromEntries(
    Object.entries(type.getFields()).map(([name, field]) => [name, String(field.type)]),
  )
}

describe('Site A Product collection GraphQL schema', () => {
  it('exposes only the nullable Site A Hub and Family roots with required identity arguments', () => {
    const rootFields = loadSchema().getQueryType()?.getFields()
    const hub = rootFields?.tio2ProductsHub
    const family = rootFields?.tio2ProductFamily

    expect(hub, 'RootQuery.tio2ProductsHub is missing').toBeDefined()
    expect(family, 'RootQuery.tio2ProductFamily is missing').toBeDefined()
    expect(String(hub?.type)).toBe('Tio2ProductsHubPage')
    expect(hub?.args.map(({name, type}) => [name, String(type)])).toEqual([
      ['siteId', 'String!'],
    ])
    expect(String(family?.type)).toBe('Tio2ProductFamilyPage')
    expect(family?.args.map(({name, type}) => [name, String(type)])).toEqual([
      ['siteId', 'String!'],
      ['slug', 'String!'],
    ])
  })

  it('keeps the Hub, Family, and card payloads explicit, non-null, and minimal', () => {
    const schema = loadSchema()

    expect(fieldShapes(schema, 'Tio2ProductsHubPage')).toEqual({
      siteId: 'String!', level: 'String!', path: 'String!',
      metaTitle: 'String!', metaDescription: 'String!', eyebrow: 'String!',
      headline: 'String!', directAnswer: 'String!', heroImageId: 'Int!',
      decisionRail: '[String!]!', familyCount: 'Int!', productCount: 'Int!',
      families: '[Tio2ProductFamilySummary!]!', knownGradeHeading: 'String!',
      knownGradeHelp: 'String!', decisionPath: 'String!', applicationBoundary: 'String!',
      resources: '[Tio2ProductCollectionLink!]!', enquiry: 'String!',
      faqItems: '[Tio2ProductCollectionFaq!]!', technicalDisclaimer: 'String!',
    })
    expect(fieldShapes(schema, 'Tio2ProductFamilyPage')).toEqual({
      siteId: 'String!', level: 'String!', path: 'String!', slug: 'String!', name: 'String!',
      metaTitle: 'String!', metaDescription: 'String!', eyebrow: 'String!',
      headline: 'String!', directAnswer: 'String!', heroImageId: 'Int!',
      decisionRail: '[String!]!', filters: '[Tio2ProductCollectionFilter!]!',
      comparisonIntroduction: 'String!', comparisonCaption: 'String!',
      selectionMethod: 'String!', validationSteps: '[String!]!',
      products: '[Tio2ProductCollectionCard!]!',
      applications: '[Tio2ProductCollectionLink!]!', resources: '[Tio2ProductCollectionLink!]!',
      enquiry: 'String!', faqItems: '[Tio2ProductCollectionFaq!]!', technicalDisclaimer: 'String!',
    })
    expect(fieldShapes(schema, 'Tio2ProductFamilySummary')).toEqual({
      slug: 'String!', name: 'String!', path: 'String!', headline: 'String!',
      directAnswer: 'String!', heroImageId: 'Int!', productCount: 'Int!',
    })
    expect(fieldShapes(schema, 'Tio2ProductCollectionCard')).toEqual({
      databaseId: 'Int!', productId: 'String!', slug: 'String!', title: 'String!', path: 'String!',
      displayOrder: 'Int!', familyCardSummary: 'String!', applicationFocus: 'String!',
      performanceFocus: 'String!', surfaceTreatmentPositioning: 'String!',
      filterTags: '[String!]!',
    })
    expect(fieldShapes(schema, 'Tio2ProductCollectionFilter')).toEqual({
      slug: 'String!', label: 'String!',
    })
    expect(fieldShapes(schema, 'Tio2ProductCollectionFaq')).toEqual({
      question: 'String!', answer: 'String!',
    })
    expect(fieldShapes(schema, 'Tio2ProductCollectionLink')).toEqual({
      databaseId: 'Int!', title: 'String!', path: 'String!',
    })
  })

  it('does not introduce forbidden commercial, private-document, or inventory fields', () => {
    const schema = loadSchema()
    const collectionTypes = [
      'Tio2ProductsHubPage', 'Tio2ProductFamilyPage', 'Tio2ProductFamilySummary',
      'Tio2ProductCollectionCard', 'Tio2ProductCollectionFilter',
      'Tio2ProductCollectionFaq', 'Tio2ProductCollectionLink',
    ]
    const forbidden = /^(?:tds|pdf|attachment|file|download|supplier|source|manufacturer|legal|price|stock|moq|private)/i

    for (const typeName of collectionTypes) {
      expect(Object.keys(fieldShapes(schema, typeName)).filter((name) => forbidden.test(name))).toEqual([])
    }
  })
})
