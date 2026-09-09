import {isWeb3FormsAccessKey} from '@/lib/forms/web3forms-config'
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {MalaysiaRequestSampleQueryPage} from '@/components/sites/tio2-my/request-sample/malaysia-request-sample-query-page'
import {buildMalaysiaRequestSampleJsonLd,serializeMalaysiaRequestSampleJsonLd} from '@/lib/seo/request-sample-jsonld'
import {buildMalaysiaRequestSampleMetadata} from '@/lib/seo/request-sample-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaRequestSamplePage} from '@/lib/wordpress/request-sample-v01-queries'

export const dynamic='force-dynamic'
async function loadPage(){const site=getCurrentSite();if(site.id!=='tio2-my'||site.wordpressScope!=='tio2-my')notFound();return {site,page:await getMalaysiaRequestSamplePage()}}
export async function generateMetadata():Promise<Metadata>{const {site,page}=await loadPage();return buildMalaysiaRequestSampleMetadata(site,{indexingAuthorized:page.releaseControls.indexingAuthorized,env:process.env})}
export default async function RequestSampleRoute(){const {site,page}=await loadPage();const receiverReady=isWeb3FormsAccessKey(process.env.NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY);const jsonLd=serializeMalaysiaRequestSampleJsonLd(buildMalaysiaRequestSampleJsonLd(site));return <MalaysiaRequestSampleQueryPage page={page} receiverReady={receiverReady} structuredData={<script key="CONV-SAMPLE-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd}}/>}/>}
