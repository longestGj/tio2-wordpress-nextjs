import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getSiteConfig} from '@/sites'
import {malaysiaResourceProcDto} from '@/tests/fixtures/tio2-my-resource-proc'

const mocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaResourceProc: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/resource-proc-v01-queries', () => ({getMalaysiaResourceProc: mocks.getMalaysiaResourceProc}))

beforeEach(() => {
  mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  mocks.getMalaysiaResourceProc.mockResolvedValue(malaysiaResourceProcDto())
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('RES-PROC route isolation', () => {
  it('renders the fixed Malaysia route and complete server content', async () => {
    const route = await import('@/app/resources/chloride-vs-sulfate-titanium-dioxide/page')
    const markup = renderToStaticMarkup(await route.default())

    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup).toContain('Chloride vs Sulfate Titanium Dioxide: A Buyer’s Evaluation Guide')
    expect(markup).toContain('Which process makes better titanium dioxide?')
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(mocks.getMalaysiaResourceProc).toHaveBeenCalledOnce()
  })

  it('propagates missing scoped CMS data without fallback', async () => {
    const error = new GraphQLResponseError([{message: 'The Malaysia RES-PROC record is missing.'}])
    mocks.getMalaysiaResourceProc.mockRejectedValue(error)
    const route = await import('@/app/resources/chloride-vs-sulfate-titanium-dioxide/page')

    await expect(route.default()).rejects.toBe(error)
    expect(mocks.getMalaysiaResourceProc).toHaveBeenCalledOnce()
  })
})
