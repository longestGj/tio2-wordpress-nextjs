import {describe, expect, it} from 'vitest'

import {RequestDocumentsContractError, toMalaysiaRequestDocumentsPageDto} from '@/lib/wordpress/request-documents-v01-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {malaysiaRequestDocumentsPageSource} from '@/tests/fixtures/tio2-my-request-documents-page'

describe('CONV-DOC DTO isolation', () => {
  it('projects one approved scoped singleton and shared Chrome config', () => {
    const dto = toMalaysiaRequestDocumentsPageDto(malaysiaRequestDocumentsPageSource())
    expect(dto.identity).toMatchObject({
      pageId: 'CONV-DOC', siteScope: 'tio2-my', path: '/request-documents/', status: 'publish',
    })
    expect(dto.globalChrome.siteScope).toBe('tio2-my')
    expect(dto.globalChrome.rfq.href).toBe('/request-a-quote/')
  })

  it('fails closed for foreign scope, wrong route and modified contract', () => {
    expect(() => toMalaysiaRequestDocumentsPageDto(malaysiaRequestDocumentsPageSource({siteScopes: {nodes: [{slug: 'tio2-a'}]}}))).toThrow(CrossSiteContentError)
    expect(() => toMalaysiaRequestDocumentsPageDto(malaysiaRequestDocumentsPageSource({publishingFields: {publicPath: '/contact'}}))).toThrow(RequestDocumentsContractError)
    expect(() => toMalaysiaRequestDocumentsPageDto(malaysiaRequestDocumentsPageSource({malaysiaRequestDocumentsContractJson: '{}'}))).toThrow(RequestDocumentsContractError)
  })
})
