import {buildSchema, isObjectType} from 'graphql'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const schemaPath = fileURLToPath(new URL('../../wordpress/schema.graphql', import.meta.url))
const loadSchema = () => buildSchema(readFileSync(schemaPath, 'utf8'))

function fieldTypes(schema: ReturnType<typeof loadSchema>, typeName: string) {
  const type = schema.getType(typeName)
  expect(isObjectType(type), `${typeName} must be an object type`).toBe(true)
  if (!isObjectType(type)) throw new Error(`${typeName} is not an object type`)
  return Object.fromEntries(
    Object.entries(type.getFields()).map(([name, field]) => [name, String(field.type)]),
  )
}

describe('Site A Application/Technical Resource GraphQL schema', () => {
  it('adds one nullable protected editorial field to each existing CPT type', () => {
    const schema = loadSchema()
    const applicationFields = fieldTypes(schema, 'Tio2Application')
    const resourceFields = fieldTypes(schema, 'Tio2Document')
    expect(applicationFields.siteAApplicationFields).toBe(
      'Tio2SiteAApplicationFields',
    )
    expect(resourceFields.siteATechnicalResourceFields).toBe(
      'Tio2SiteATechnicalResourceFields',
    )
    expect(applicationFields.applicationFields).toBeUndefined()
    expect(resourceFields.technicalResourceFields).toBeUndefined()
    expect(schema.getType('ApplicationFields')).toBeUndefined()
    expect(schema.getType('TechnicalResourceFields')).toBeUndefined()
  })

  it('uses typed stable relationship links and typed nested editorial objects', () => {
    const schema = loadSchema()
    expect(fieldTypes(schema, 'Tio2EditorialLink')).toEqual({
      targetType: 'String!',
      targetKey: 'String!',
      title: 'String!',
      path: 'String!',
      href: 'String',
    })
    expect(fieldTypes(schema, 'Tio2EditorialSection')).toEqual({
      id: 'String!',
      heading: 'String!',
      html: 'String!',
    })
    expect(fieldTypes(schema, 'Tio2EditorialFaq')).toEqual({
      question: 'String!',
      answerHtml: 'String!',
    })
    expect(fieldTypes(schema, 'Tio2EditorialCta')).toEqual({
      kind: 'String!',
      label: 'String!',
      href: 'String!',
    })
    expect(fieldTypes(schema, 'Tio2ApplicationStartingProduct')).toEqual({
      productId: 'String!',
      role: 'String!',
      label: 'String!',
      summaryHtml: 'String!',
    })
    expect(fieldTypes(schema, 'Tio2EditorialComparisonRow')).toEqual({cells: '[String!]!'})
    expect(fieldTypes(schema, 'Tio2EditorialComparisonTable')).toEqual({
      columns: '[String!]!',
      rows: '[Tio2EditorialComparisonRow!]!',
    })
  })

  it('exposes only the approved camelCase Application fields', () => {
    const schema = loadSchema()
    expect(fieldTypes(schema, 'Tio2SiteAApplicationFields')).toEqual({
      applicationId: 'String!',
      applicationLevel: 'String!',
      family: 'String!',
      parentApplication: 'Tio2EditorialLink',
      metaTitle: 'String!',
      metaDescription: 'String!',
      eyebrow: 'String!',
      headline: 'String!',
      directAnswer: 'String!',
      applicationContext: 'String!',
      buyerProblem: 'String!',
      selectionFactors: '[String!]!',
      powderDataLimits: 'String!',
      validationPlan: '[String!]!',
      customerInputs: '[String!]!',
      bodySections: '[Tio2EditorialSection!]!',
      startingProducts: '[Tio2ApplicationStartingProduct!]!',
      faqItems: '[Tio2EditorialFaq!]!',
      childApplications: '[Tio2EditorialLink!]!',
      relatedApplications: '[Tio2EditorialLink!]!',
      relatedResources: '[Tio2EditorialLink!]!',
      relatedProducts: '[Tio2EditorialLink!]!',
      ctas: '[Tio2EditorialCta!]!',
      technicalDisclaimer: 'String!',
    })
  })

  it('exposes only the approved camelCase Technical Resource fields', () => {
    const schema = loadSchema()
    expect(fieldTypes(schema, 'Tio2SiteATechnicalResourceFields')).toEqual({
      resourceId: 'String!',
      resourceKind: 'String!',
      cluster: 'String!',
      metaTitle: 'String!',
      metaDescription: 'String!',
      eyebrow: 'String!',
      headline: 'String!',
      directAnswer: 'String!',
      keyTakeaways: '[String!]!',
      sections: '[Tio2EditorialSection!]!',
      comparisonTable: 'Tio2EditorialComparisonTable',
      practicalImplications: '[String!]!',
      commonMistakes: '[String!]!',
      evaluationMethod: '[String!]!',
      faqItems: '[Tio2EditorialFaq!]!',
      childResources: '[Tio2EditorialLink!]!',
      relatedApplications: '[Tio2EditorialLink!]!',
      relatedResources: '[Tio2EditorialLink!]!',
      relatedProducts: '[Tio2EditorialLink!]!',
      ctas: '[Tio2EditorialCta!]!',
      technicalDisclaimer: 'String!',
    })
  })

  it('has no JSON or private/evidence/download escape hatch on either field object', () => {
    const schema = loadSchema()
    for (const typeName of ['Tio2SiteAApplicationFields', 'Tio2SiteATechnicalResourceFields']) {
      const fields = fieldTypes(schema, typeName)
      for (const forbidden of [
        'acf', 'rawAcf', 'json', 'source', 'sourcePath', 'evidence', 'evidenceUrl',
        'tdsAttachment', 'tdsUrl', 'localPath', 'manufacturer', 'legalEntity',
      ]) {
        expect(fields[forbidden], `${typeName}.${forbidden} must stay private`).toBeUndefined()
      }
      expect(Object.values(fields).some((type) => type.includes('JSON'))).toBe(false)
    }
  })
})
