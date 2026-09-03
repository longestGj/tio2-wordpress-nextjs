import {describe, expect, it} from 'vitest'

import {RequestSampleContractError, toMalaysiaRequestSamplePageDto} from '@/lib/wordpress/request-sample-v01-dto'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'

const source = (overrides: Record<string, unknown> = {}) => ({
  id: 'request-sample-page-21', modifiedGmt: '2026-09-03T10:00:00', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/request-sample'},
  malaysiaRequestSampleContractJson: JSON.stringify(contract), ...overrides,
})

describe('Malaysia Request Sample DTO', () => {
  it('maps only the exact approved Malaysia contract', () => {
    const dto = toMalaysiaRequestSamplePageDto(source())
    expect(dto.identity).toEqual(expect.objectContaining({pageId: 'CONV-SAMPLE', siteScope: 'tio2-my', path: '/request-sample/'}))
    expect(dto.globalChrome.siteScope).toBe('tio2-my')
  })

  it.each([
    {siteScopes: {nodes: [{slug: 'tio2-a'}]}},
    {siteScopes: {nodes: [{slug: 'tio2-my'}, {slug: 'tio2-a'}]}},
    {publishingFields: {publicPath: '/request-sample-wrong'}},
    {status: 'draft'},
    {malaysiaRequestSampleContractJson: '{}'},
  ])('fails closed for invalid identity %#', (override) => {
    expect(() => toMalaysiaRequestSamplePageDto(source(override))).toThrow()
  })

  it('rejects malformed record JSON contract', () => {
    expect(() => toMalaysiaRequestSamplePageDto(source({malaysiaRequestSampleContractJson: '{'}))).toThrow(RequestSampleContractError)
  })
})
