import {afterEach,expect,it,vi} from 'vitest'
import {getMalaysiaUkMarketPage} from '@/lib/wordpress/market-page-uk-v01-queries'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-uk-001.json'
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
it('UK query requests only the registered singleton and uses three scope-local cache tags',async()=>{
  vi.stubEnv('WORDPRESS_GRAPHQL_URL','https://cms.example.test/graphql')
  const fetchMock=vi.fn(async(_url:unknown,init?:RequestInit)=>{
    const body=JSON.parse(String(init?.body))
    expect(body.query).toContain('malaysiaUkMarketRecordJson')
    expect(body.variables).toEqual({})
    return Response.json({data:{malaysiaUkMarketRecordJson:JSON.stringify({
      id:'uk-1',modifiedGmt:'2026-09-05T01:02:03',status:'publish',siteScopes:{nodes:[{slug:'tio2-my'}]},
      publishingFields:{publicPath:'/markets/united-kingdom'},malaysiaUkMarketContractJson:JSON.stringify(contract),
      routeReadiness:Object.fromEntries(contract.routeRegistry.map(r=>[r.targetPageId,false])),
    })}})
  })
  vi.stubGlobal('fetch',fetchMock)
  expect((await getMalaysiaUkMarketPage()).identity).toMatchObject({pageId:'MARKET-UK-001',siteScope:'tio2-my'})
  expect((fetchMock.mock.calls[0]![1] as RequestInit & {next:{tags:string[]}}).next.tags).toEqual([
    'site:tio2-my','route:tio2-my:/markets/united-kingdom','content:tio2-my--market--MARKET-UK-001--en',
  ])
})
it.each([{data:null,errors:[{message:'missing UK record'}]},{data:{malaysiaUkMarketRecordJson:null}},{data:{malaysiaUkMarketRecordJson:'{}'}}])('never falls back when UK CMS returns %j',async(result)=>{
  vi.stubEnv('WORDPRESS_GRAPHQL_URL','https://cms.example.test/graphql')
  const fetchMock=vi.fn(async()=>Response.json(result));vi.stubGlobal('fetch',fetchMock)
  await expect(getMalaysiaUkMarketPage()).rejects.toThrow()
  expect(fetchMock).toHaveBeenCalledOnce()
})
