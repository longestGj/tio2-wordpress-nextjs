import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'
import {describe, expect, it} from 'vitest'

import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'
import {HomepageContractError} from '@/lib/wordpress/homepage-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'

function source() {
  return {
    id: 'homepage-my-1',
    modifiedGmt: '2026-08-31T01:02:03',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
    malaysiaHomepageContractJson: `${JSON.stringify(approvedContract)}\n`,
  }
}

describe('Malaysia Homepage DTO', () => {
  it('accepts only the exact approved contract and scope', () => {
    expect(toMalaysiaHomepageDto(source())).toMatchObject({
      packageId: 'HOME-001-G7-HANDOFF-01',
      identity: {
        id: 'homepage-my-1',
        siteId: 'tio2-my',
        path: '/',
        schemaVersion: 'homepage-v0.4-malaysia',
        status: 'publish',
        modified: '2026-08-31T01:02:03.000Z',
      },
      products: {groups: expect.any(Array)},
      schemaGraph: {'@graph': expect.any(Array)},
    })
  })

  it('rejects foreign scope without retry or fallback', () => {
    const value = source()
    value.siteScopes.nodes[0]!.slug = 'tio2-a'
    expect(() => toMalaysiaHomepageDto(value)).toThrow(CrossSiteContentError)
  })

  it('rejects any payload mutation, malformed JSON, and draft publication', () => {
    const mutated = source()
    const payload = JSON.parse(mutated.malaysiaHomepageContractJson)
    payload.hero.heading = 'Unapproved replacement'
    mutated.malaysiaHomepageContractJson = JSON.stringify(payload)
    expect(() => toMalaysiaHomepageDto(mutated)).toThrow(HomepageContractError)

    const malformed = source()
    malformed.malaysiaHomepageContractJson = '{'
    expect(() => toMalaysiaHomepageDto(malformed)).toThrow(HomepageContractError)

    const draft = source()
    draft.status = 'draft'
    expect(() => toMalaysiaHomepageDto(draft)).toThrow(HomepageContractError)
  })
})
