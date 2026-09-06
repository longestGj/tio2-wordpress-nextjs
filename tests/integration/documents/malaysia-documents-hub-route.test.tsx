import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {toMalaysiaDocumentsHubDto} from '@/lib/wordpress/documents-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-documents-hub.json'

const mocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaDocumentsHub: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/documents-hub-v01-queries', () => ({getMalaysiaDocumentsHub: mocks.getMalaysiaDocumentsHub}))

const source = () => ({
  id: 'documents-hub-1', modifiedGmt: '2026-09-02T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents'},
  malaysiaDocumentsHubContractJson: JSON.stringify(contract),
})

beforeEach(() => {
  mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  mocks.getMalaysiaDocumentsHub.mockResolvedValue(toMalaysiaDocumentsHubDto(source()))
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('DOC-000 route isolation', () => {
  it('renders only the Malaysia scope and server-rendered FAQ answers', async () => {
    const route = await import('@/app/documents/page')
    const markup = renderToStaticMarkup(await route.default())
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup).toContain(contract.buyerQuestions.items[5].answer)
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
  })

  it('propagates missing CMS data and never falls back across scope', async () => {
    const error = new GraphQLResponseError([{message: 'The Malaysia Documents Hub record is missing.'}])
    mocks.getMalaysiaDocumentsHub.mockRejectedValue(error)
    const route = await import('@/app/documents/page')
    await expect(route.default()).rejects.toBe(error)
    expect(mocks.getMalaysiaDocumentsHub).toHaveBeenCalledOnce()
  })
})
