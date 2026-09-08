import {createHmac,randomUUID} from 'node:crypto'
import {afterEach,expect,it,vi} from 'vitest'
const cache=vi.hoisted(()=>({revalidateTag:vi.fn(),revalidatePath:vi.fn()}))
vi.mock('next/cache',()=>cache)
import {POST} from '@/app/api/revalidate/route'

afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()})

it('invalidates only the Chloride Process route and compatible content identity',async()=>{
  vi.stubEnv('SITE_ID','tio2-my');vi.stubEnv('REVALIDATION_SECRET','chloride-process-test-secret')
  const body=JSON.stringify({eventId:randomUUID(),siteIds:['tio2-my'],contentId:18529,
    paths:['/products/chloride-process-titanium-dioxide'],entityIds:[],modified:new Date().toISOString()})
  const response=await POST(new Request('http://localhost/api/revalidate',{method:'POST',body,headers:{
    'content-type':'application/json','x-tio2-signature':createHmac('sha256','chloride-process-test-secret').update(body).digest('hex'),
  }}))
  expect(response.status).toBe(200)
  expect(cache.revalidateTag.mock.calls.map(call=>call[0])).toEqual([
    'content:tio2-my--product-process--PRODUCT-PROC-CL--en--product-process-chloride-v0.1',
    'route:tio2-my:/products/chloride-process-titanium-dioxide',
  ])
  expect(cache.revalidatePath).toHaveBeenCalledWith('/products/chloride-process-titanium-dioxide')
})
