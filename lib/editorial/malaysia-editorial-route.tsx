import {notFound} from 'next/navigation'
import {connection} from 'next/server'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaEditorialPage} from '@/lib/wordpress/editorial-v01-queries'
import {EditorialContractError,EditorialFreshnessError} from '@/lib/wordpress/editorial-v01-dto'
import {GraphQLResponseError} from '@/lib/wordpress/client'
import {buildEditorialJsonLd,buildEditorialMetadata} from '@/lib/seo/editorial-metadata'
import {serializeJsonLd} from '@/lib/seo/jsonld'
import {MalaysiaEditorialPage} from '@/components/sites/tio2-my/editorial/malaysia-editorial-page'

async function requestPage(pageId:string) {
  const site=getCurrentSite()
  if(site.id!=='tio2-my' || site.wordpressScope!=='tio2-my') notFound()
  await connection()
  try {return {site,page:await getMalaysiaEditorialPage(pageId,site.wordpressScope)}}
  catch(error) {
    const reason=error instanceof EditorialFreshnessError?'freshness':error instanceof EditorialContractError?'contract':error instanceof GraphQLResponseError?'upstream':null
    if(reason) {
      console.warn('[tio2-editorial-unavailable]',{siteScope:'tio2-my',pageId,reason})
      notFound()
    }
    throw error
  }
}
export async function generateMalaysiaEditorialMetadata(pageId:string) {
  const {site,page}=await requestPage(pageId)
  return buildEditorialMetadata(site,page)
}
export async function renderMalaysiaEditorialRoute(pageId:string) {
  const {site,page}=await requestPage(pageId)
  return <MalaysiaEditorialPage page={page} structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(buildEditorialJsonLd(site,page))}}/>}/>
}
