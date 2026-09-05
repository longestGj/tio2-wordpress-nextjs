import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getSiteConfig} from '@/sites'
import {malaysiaResourceOriginDto} from '@/tests/fixtures/tio2-my-resource-origin'

const mocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaResourceOrigin: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/resource-origin-v01-queries', () => ({getMalaysiaResourceOrigin: mocks.getMalaysiaResourceOrigin}))

beforeEach(() => {
  mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  mocks.getMalaysiaResourceOrigin.mockResolvedValue(malaysiaResourceOriginDto())
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('RES-ORIGIN route isolation', () => {
  it('renders the fixed Malaysia route and all FAQ content from the scoped query', async () => {
    const route = await import('@/app/resources/non-china-titanium-dioxide/page')
    const markup = renderToStaticMarkup(await route.default())

    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup).toContain('Non-China Titanium Dioxide: A Procurement Evaluation Guide')
    expect(markup).toContain('What should buyers do after completing the review?')
    expect(mocks.getMalaysiaResourceOrigin).toHaveBeenCalledOnce()
  })

  it('propagates missing scoped CMS data without a fallback request', async () => {
    const error = new GraphQLResponseError([{message: 'The Malaysia RES-ORIGIN record is missing.'}])
    mocks.getMalaysiaResourceOrigin.mockRejectedValue(error)
    const route = await import('@/app/resources/non-china-titanium-dioxide/page')

    await expect(route.default()).rejects.toBe(error)
    expect(mocks.getMalaysiaResourceOrigin).toHaveBeenCalledOnce()
  })
})
