import {cache} from 'react'
import {getEditorialContract,editorialTag} from '@/lib/editorial/malaysia-editorial-contracts'
import {fetchGraphQL} from './client'
import {routeTag,siteTag} from './cache-tags'
import {assertEditorialFreshness,toMalaysiaEditorialDto,EditorialContractError} from './editorial-v01-dto'
import {GetMalaysiaEditorialRecordDocument} from './generated'

export const editorialQuery=GetMalaysiaEditorialRecordDocument
export const getMalaysiaEditorialPage=cache(async (pageId:string,siteScope:string)=>{
  if(siteScope!=='tio2-my') throw new EditorialContractError('request scope')
  const contract=getEditorialContract(pageId)
  const token=process.env.WORDPRESS_EDITORIAL_API_TOKEN
  if(!token) throw new EditorialContractError('server credential unavailable')
  const data=await fetchGraphQL<{malaysiaEditorialRecordJson:string},{pageId:string;siteScope:string}>(editorialQuery,{pageId,siteScope},{
    headers:{'x-tio2-editorial-token':token},cache:'no-store',
    tags:[siteTag(siteScope),routeTag(siteScope,contract.identity.path),editorialTag(siteScope,pageId)],
  })
  let source:unknown
  try {source=JSON.parse(data.malaysiaEditorialRecordJson)} catch {throw new EditorialContractError('response JSON')}
  const page=toMalaysiaEditorialDto(contract,source)
  assertEditorialFreshness(page,page.freshnessControl)
  return page
})
