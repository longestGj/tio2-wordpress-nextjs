import {afterEach,describe,expect,it,vi} from 'vitest'
import {EDITORIAL_CONTRACTS} from '@/lib/editorial/malaysia-editorial-contracts'
import {EditorialContractError,EditorialFreshnessError} from '@/lib/wordpress/editorial-v01-dto'
import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getSiteConfig} from '@/sites'

vi.mock('next/font/google',()=>({Inter:()=>({variable:'editorial-inter-variable'})}))
vi.mock('next/font/local',()=>({default:()=>({variable:'approved-local-inter-variable'})}))

const mocks=vi.hoisted(()=>({site:vi.fn(),query:vi.fn(),connection:vi.fn(),notFound:vi.fn(()=>{throw new Error('NOT_FOUND')})}))
vi.mock('@/lib/sites/current-site',()=>({getCurrentSite:mocks.site}))
vi.mock('@/lib/wordpress/editorial-v01-queries',()=>({getMalaysiaEditorialPage:mocks.query}))
vi.mock('next/navigation',()=>({notFound:mocks.notFound}))
vi.mock('next/server',()=>({connection:mocks.connection}))
afterEach(()=>vi.clearAllMocks())
describe('all editorial routes reject foreign site identity before data and metadata',()=>{
 for(const scope of ['tio2-a','tio2-b'] as const) it.each(EDITORIAL_CONTRACTS.map(p=>({id:p.identity.pageId})))(`${scope} cannot render $id`,async({id})=>{
  mocks.site.mockReturnValue(getSiteConfig(scope))
  const route=await import('@/lib/editorial/malaysia-editorial-route')
  await expect(route.renderMalaysiaEditorialRoute(id)).rejects.toThrow('NOT_FOUND')
  await expect(route.generateMalaysiaEditorialMetadata(id)).rejects.toThrow('NOT_FOUND')
  expect(mocks.query).not.toHaveBeenCalled()
  expect(mocks.connection).not.toHaveBeenCalled()
 })
 it('rejects inconsistent Malaysia host and WordPress scope',async()=>{
  mocks.site.mockReturnValue({...getSiteConfig('tio2-my'),wordpressScope:'tio2-a'})
  const route=await import('@/lib/editorial/malaysia-editorial-route')
  await expect(route.renderMalaysiaEditorialRoute('APP-COAT')).rejects.toThrow('NOT_FOUND')
  expect(mocks.query).not.toHaveBeenCalled()
 })
})

describe('editorial route suppression diagnostics',()=>{
 it.each([
  ['freshness',new EditorialFreshnessError()],
  ['contract',new EditorialContractError('sensitive-package-field')],
  ['upstream',new GraphQLResponseError([{message:'sensitive evidence detail'}])],
 ])('logs only a bounded %s reason before suppressing the route',async(reason,error)=>{
  const diagnostic=vi.spyOn(console,'warn').mockImplementation(()=>undefined)
  mocks.site.mockReturnValue(getSiteConfig('tio2-my'))
  mocks.query.mockRejectedValue(error)
  const route=await import('@/lib/editorial/malaysia-editorial-route')
  await expect(route.renderMalaysiaEditorialRoute('RES-TRADE-EU')).rejects.toThrow('NOT_FOUND')
  expect(diagnostic).toHaveBeenCalledWith('[tio2-editorial-unavailable]',{
   siteScope:'tio2-my',pageId:'RES-TRADE-EU',reason,
  })
  const logged=JSON.stringify(diagnostic.mock.calls)
  expect(logged).not.toContain('sensitive')
  expect(logged).not.toContain('A40568E5')
  diagnostic.mockRestore()
 })
})
