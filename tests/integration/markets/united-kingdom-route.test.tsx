import {afterEach,expect,it,vi} from 'vitest'
import {getSiteConfig} from '@/sites'
const boundary=vi.hoisted(()=>({site:vi.fn(),query:vi.fn()}))
vi.mock('@/lib/sites/current-site',()=>({getCurrentSite:boundary.site}))
vi.mock('@/lib/wordpress/market-page-uk-v01-queries',()=>({getMalaysiaUkMarketPage:boundary.query}))
// Font compilation is owned by Next; the real compiled font is checked in E2E.
vi.mock('next/font/google',()=>({Inter:()=>({variable:'test-inter'})}))
afterEach(()=>{vi.clearAllMocks();vi.resetModules()})
it.each(['tio2-a','tio2-b'] as const)('rejects %s before querying UK data, for body and metadata',async id=>{
  boundary.site.mockReturnValue(getSiteConfig(id))
  const route=await import('@/app/markets/united-kingdom/page')
  await expect(route.default()).rejects.toMatchObject({digest:'NEXT_HTTP_ERROR_FALLBACK;404'})
  await expect(route.generateMetadata()).rejects.toMatchObject({digest:'NEXT_HTTP_ERROR_FALLBACK;404'})
  expect(boundary.query).not.toHaveBeenCalled()
})
it('propagates missing Malaysia CMS errors without a null or fallback page',async()=>{
  boundary.site.mockReturnValue(getSiteConfig('tio2-my'))
  const error=new Error('Controlled missing Malaysia record')
  boundary.query.mockRejectedValue(error)
  const route=await import('@/app/markets/united-kingdom/page')
  await expect(route.default()).rejects.toBe(error)
  await expect(route.generateMetadata()).rejects.toBe(error)
})
