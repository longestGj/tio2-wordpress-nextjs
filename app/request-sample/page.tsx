import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {MalaysiaRequestSamplePage} from '@/components/sites/tio2-my/request-sample/malaysia-request-sample-page'
import {resolveMalaysiaSamplePrefill} from '@/lib/request-sample/malaysia-request-sample-prefill'
import {buildMalaysiaRequestSampleJsonLd,serializeMalaysiaRequestSampleJsonLd} from '@/lib/seo/request-sample-jsonld'
import {buildMalaysiaRequestSampleMetadata} from '@/lib/seo/request-sample-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaRequestSamplePage} from '@/lib/wordpress/request-sample-v01-queries'

export const revalidate=3600
interface RouteProps{readonly searchParams:Promise<Record<string,string|string[]|undefined>>}
async function loadPage(){const site=getCurrentSite();if(site.id!=='tio2-my'||site.wordpressScope!=='tio2-my')notFound();return {site,page:await getMalaysiaRequestSamplePage()}}
export async function generateMetadata():Promise<Metadata>{const {site,page}=await loadPage();return buildMalaysiaRequestSampleMetadata(site,{indexingAuthorized:page.releaseControls.indexingAuthorized,env:process.env})}
export default async function RequestSampleRoute({searchParams}:RouteProps){const [{site,page},query]=await Promise.all([loadPage(),searchParams]);const prefill=resolveMalaysiaSamplePrefill({source_page_id:query.source_page_id,grade_id:query.grade_id,application_id:query.application_id,process_context:query.process_context,market_id:query.market_id,destination:query.destination,document_needs:query['document_needs[]']??query.document_needs,resource_context:query.resource_context});const receiverReady=Boolean(process.env.TIO2_MY_REQUEST_SAMPLE_RECEIVER_URL?.trim()&&process.env.TIO2_MY_REQUEST_SAMPLE_RECEIVER_TOKEN?.trim());const jsonLd=serializeMalaysiaRequestSampleJsonLd(buildMalaysiaRequestSampleJsonLd(site));return <MalaysiaRequestSamplePage page={page} prefill={prefill} receiverReady={receiverReady} structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd}}/>}/>}
