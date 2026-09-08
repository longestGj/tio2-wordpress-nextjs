import {createHmac,randomUUID} from 'node:crypto'
import {afterEach,expect,it,vi} from 'vitest'
const cache=vi.hoisted(()=>({revalidateTag:vi.fn(),revalidatePath:vi.fn()}))
vi.mock('next/cache',()=>cache)
import {POST} from '@/app/api/revalidate/route'
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()})
it('invalidates only the Poland route and content for the Malaysia singleton',async()=>{
  vi.stubEnv('SITE_ID','tio2-my');vi.stubEnv('REVALIDATION_SECRET','poland-test-secret')
  const body=JSON.stringify({eventId:randomUUID(),siteIds:['tio2-my'],contentId:999,paths:['/markets/poland'],entityIds:[],modified:new Date().toISOString()})
  const response=await POST(new Request('http://localhost/api/revalidate',{method:'POST',body,headers:{'content-type':'application/json','x-tio2-signature':createHmac('sha256','poland-test-secret').update(body).digest('hex')}}))
  expect(response.status).toBe(200)
  expect(cache.revalidateTag.mock.calls.map(c=>c[0])).toEqual(['content:tio2-my--market--MARKET-EU-PL--en','route:tio2-my:/markets/poland'])
  expect(cache.revalidatePath).toHaveBeenCalledWith('/markets/poland')
})
