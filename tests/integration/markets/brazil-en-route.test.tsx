import {afterEach, expect, it, vi} from 'vitest'
import {getSiteConfig} from '@/sites'
vi.mock('next/font/google', () => ({Inter: () => ({variable: '--font-brazil-market-test'})}))
const boundary = vi.hoisted(() => ({site: vi.fn(), query: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: boundary.site}))
vi.mock('@/lib/wordpress/market-page-brazil-en-v01-queries', () => ({getMalaysiaBrazilEnMarketPage: boundary.query}))
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

it.each(['tio2-a', 'tio2-b'] as const)('rejects %s before querying Brazil EN data', async id => {
  boundary.site.mockReturnValue(getSiteConfig(id))
  const route = await import('@/app/markets/brazil/page')
  await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  await expect(route.generateMetadata()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  expect(boundary.query).not.toHaveBeenCalled()
})

it('propagates a missing Malaysia CMS record instead of rendering fallback copy', async () => {
  boundary.site.mockReturnValue(getSiteConfig('tio2-my'))
  const error = new Error('Controlled missing Brazil English record')
  boundary.query.mockRejectedValue(error)
  const route = await import('@/app/markets/brazil/page')
  await expect(route.default()).rejects.toBe(error)
  await expect(route.generateMetadata()).rejects.toBe(error)
})
