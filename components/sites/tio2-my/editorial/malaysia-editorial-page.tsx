import type {ReactNode} from 'react'
import type {EditorialDto} from '@/lib/editorial/editorial-types'
import chrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {MalaysiaGlobalHeader,MalaysiaGlobalFooter} from '../malaysia-global-chrome'
import {EditorialAnchorFocus} from './editorial-anchor-focus'
import './editorial-base.css'

export function MalaysiaEditorialPage({page,structuredData}:{readonly page:EditorialDto;readonly structuredData?:ReactNode}) {
  return <div data-editorial-page={page.identity.pageId} data-page-id={page.identity.pageId} data-site-scope="tio2-my" data-site-id="tio2-my">
    {structuredData}
    <MalaysiaGlobalHeader chrome={chrome} currentPageId={page.identity.section==='resources'?'RES-000':'APP-000'} sourcePageId={page.identity.pageId}/>
    <main id="main-content" className={page.mainClass} dangerouslySetInnerHTML={{__html:page.bodyHtml}}/>
    <EditorialAnchorFocus pageId={page.identity.pageId}/>
    <MalaysiaGlobalFooter chrome={chrome} sourcePageId={page.identity.pageId}/>
  </div>
}
