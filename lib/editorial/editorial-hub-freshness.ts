import type {MalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-types'

export async function filterReviewedTradeCards(hub:MalaysiaResourceHubDto,isCurrent:(pageId:string)=>Promise<boolean>):Promise<MalaysiaResourceHubDto> {
  const cards=[...hub.featuredResources,...hub.latestResources]
  const decisions=await Promise.all(cards.map(async card=>({card,keep:card.resourceType!=='TRADE_UPDATE'||await isCurrent(card.pageId)})))
  const allowed=new Set(decisions.filter(item=>item.keep).map(item=>item.card.pageId))
  const featured=hub.featuredResources.filter(card=>allowed.has(card.pageId))
  const latest=hub.latestResources.filter(card=>allowed.has(card.pageId))
  const visible=[...featured,...latest]
  return {...hub,featuredResources:visible.length===1?visible:featured,latestResources:visible.length===1?[]:latest,
    publicState:visible.length===0?'H0_NO_QUALIFIED_RESOURCE':visible.some(card=>card.resourceType==='TRADE_UPDATE')?'H4_TRADE_ITEM':visible.length===1?'H2_ONE_PUBLIC_RESOURCE':'H3_MULTIPLE_PUBLIC_RESOURCES'}
}
