import type {MalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-types'
import {resourceState} from '@/lib/wordpress/resource-hub-v01-dto'

export async function filterReviewedTradeCards(hub: MalaysiaResourceHubDto, isCurrent: (pageId: string) => Promise<boolean>): Promise<MalaysiaResourceHubDto> {
  const cards = hub.resourceGroups.flatMap(group => group.items)
  const decisions = await Promise.all(cards.map(async card => ({card, keep:
    !['RES-CHEMOURS', 'RES-R706'].includes(card.pageId) && card.resourceType !== 'TRADE_UPDATE' || await isCurrent(card.pageId)})))
  const allowed = new Set(decisions.filter(item => item.keep).map(item => item.card.pageId))
  const resourceGroups = hub.resourceGroups.flatMap(group => {
    const items = group.items.filter(card => allowed.has(card.pageId))
    return items.length ? [{...group, items}] : []
  })
  return {...hub, resourceGroups, publicState: resourceState(allowed.size)}
}
