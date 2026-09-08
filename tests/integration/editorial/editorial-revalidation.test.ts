import {createHmac,randomUUID} from 'node:crypto'
import {afterEach,expect,it,vi} from 'vitest'
const hooks=vi.hoisted(()=>({revalidatePath:vi.fn(),revalidateTag:vi.fn()}))
vi.mock('next/cache',()=>hooks)
import {POST} from '@/app/api/revalidate/route'
import {EDITORIAL_CONTRACTS,editorialTag} from '@/lib/editorial/malaysia-editorial-contracts'
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()})
it.each(EDITORIAL_CONTRACTS.map(page=>({page,id:page.identity.pageId})))('invalidates only $id editorial content and its Malaysia route',async({page,id})=>{
 vi.stubEnv('SITE_ID','tio2-my');vi.stubEnv('REVALIDATION_SECRET','test-editorial-secret')
 const path=page.identity.path.slice(0,-1)
 const body=JSON.stringify({eventId:randomUUID(),siteIds:['tio2-my'],contentId:456,paths:[path],entityIds:[],modified:new Date().toISOString()})
 const signature=createHmac('sha256','test-editorial-secret').update(body).digest('hex')
 const response=await POST(new Request('http://localhost/api/revalidate',{method:'POST',headers:{'x-tio2-signature':signature,'content-type':'application/json'},body}))
 expect(response.status).toBe(200)
 const result=await response.json()
 expect(result.revalidatedTags).toContain(editorialTag('tio2-my',id))
 expect(result.revalidatedTags.filter((tag:string)=>tag.includes('--editorial--'))).toEqual([editorialTag('tio2-my',id)])
 expect(result.revalidatedTags.some((tag:string)=>tag.includes('tio2-a')||tag.includes('tio2-b'))).toBe(false)
})
