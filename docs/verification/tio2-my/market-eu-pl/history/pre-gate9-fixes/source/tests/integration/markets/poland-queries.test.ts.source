import {afterEach,expect,it,vi} from 'vitest'
import {getMalaysiaPolandMarketPage} from '@/lib/wordpress/market-page-poland-v01-queries'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json'
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
it('Poland query requests only the registered singleton and uses three scope-local cache tags',async()=>{
  vi.stubEnv('WORDPRESS_GRAPHQL_URL','https://cms.example.test/graphql')
  const fetchMock=vi.fn(async(_url:unknown,init?:RequestInit)=>{
    const body=JSON.parse(String(init?.body))
    expect(body.query).toContain('malaysiaPolandMarketRecordJson')
    expect(body.variables).toEqual({})
    return Response.json({data:{malaysiaPolandMarketRecordJson:JSON.stringify({
      id:'poland-1',modifiedGmt:'2026-09-05T01:02:03',status:'publish',siteScopes:{nodes:[{slug:'tio2-my'}]},
      publishingFields:{publicPath:'/markets/poland'},malaysiaPolandMarketContractJson:JSON.stringify(contract),
    })}})
  })
  vi.stubGlobal('fetch',fetchMock)
  expect((await getMalaysiaPolandMarketPage()).identity).toMatchObject({pageId:'MARKET-EU-PL',siteScope:'tio2-my'})
  expect((fetchMock.mock.calls[0]![1] as RequestInit & {next:{tags:string[]}}).next.tags).toEqual([
    'site:tio2-my','route:tio2-my:/markets/poland','content:tio2-my--market--MARKET-EU-PL--en',
  ])
})
it.each([{data:null,errors:[{message:'missing Poland record'}]},{data:{malaysiaPolandMarketRecordJson:null}},{data:{malaysiaPolandMarketRecordJson:'{}'}}])('never falls back when Poland CMS returns %j',async(result)=>{
  vi.stubEnv('WORDPRESS_GRAPHQL_URL','https://cms.example.test/graphql')
  const fetchMock=vi.fn(async()=>Response.json(result));vi.stubGlobal('fetch',fetchMock)
  await expect(getMalaysiaPolandMarketPage()).rejects.toThrow()
  expect(fetchMock).toHaveBeenCalledOnce()
})
