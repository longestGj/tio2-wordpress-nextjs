import {expect,it} from 'vitest'
import {filterReviewedTradeCards} from '@/lib/editorial/editorial-hub-freshness'
import type {MalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-types'
const guide={pageId:'RES-ORIGIN',resourceType:'PROCUREMENT_GUIDE',title:'Origin guide'}
const trade={pageId:'RES-TRADE-EU',resourceType:'TRADE_UPDATE',title:'EU dated summary'}
const hub={featuredResources:[trade],latestResources:[guide],publicState:'H4_TRADE_ITEM'} as unknown as MalaysiaResourceHubDto
it('removes warmed Hub Trade facts and recalculates layout when source review is unavailable',async()=>{
 const result=await filterReviewedTradeCards(hub,async()=>false)
 expect(result.featuredResources).toEqual([guide]);expect(result.latestResources).toEqual([])
 expect(result.publicState).toBe('H2_ONE_PUBLIC_RESOURCE');expect(JSON.stringify(result)).not.toContain('EU dated summary')
})
it('retains a currently reviewed Trade card and its approved position',async()=>{
 const result=await filterReviewedTradeCards(hub,async id=>id==='RES-TRADE-EU')
 expect(result.featuredResources).toEqual([trade]);expect(result.publicState).toBe('H4_TRADE_ITEM')
})
