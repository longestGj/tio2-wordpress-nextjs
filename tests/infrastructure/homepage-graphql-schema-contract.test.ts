import {buildSchema, isListType, isObjectType} from 'graphql'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const schemaPath = fileURLToPath(
  new URL('../../wordpress/schema.graphql', import.meta.url),
)

describe('Homepage controlled-select GraphQL schema', () => {
  it.each([
    'rfqIntro',
    'rfqPrivacyText',
    'rfqSuccessHeading',
    'rfqSuccessMessage',
  ])('exposes HomepageFields.%s as a selectable value list', (fieldName) => {
    const schema = buildSchema(readFileSync(schemaPath, 'utf8'))
    const homepageFields = schema.getType('HomepageFields')
    expect(homepageFields?.toString()).toBe('HomepageFields')
    if (!homepageFields || !('getFields' in homepageFields)) {
      throw new Error('HomepageFields is not an object type')
    }

    const field = homepageFields.getFields()[fieldName]
    expect(field, `HomepageFields.${fieldName} is missing`).toBeDefined()
    expect(isListType(field!.type), `${fieldName} must preserve ACF select list shape`).toBe(true)
    expect(String(field!.type)).toBe('[String]')
  })

  it('exposes the editorial GEO object and every structured module', () => {
    const schema = buildSchema(readFileSync(schemaPath, 'utf8'))
    const editorialGeoFields = schema.getType('EditorialGeoFields')
    expect(isObjectType(editorialGeoFields), 'EditorialGeoFields must be an object type')
      .toBe(true)
    if (!isObjectType(editorialGeoFields)) {
      throw new Error('EditorialGeoFields is not an object type')
    }

    for (const fieldName of [
      'decisionQuestions',
      'applicationBriefs',
      'supplyRoutes',
      'evidenceItems',
      'evaluationSteps',
      'geoFaqs',
      'glossaryItems',
    ]) {
      expect(
        editorialGeoFields.getFields()[fieldName],
        `EditorialGeoFields.${fieldName} is missing`,
      ).toBeDefined()
    }
  })
})
