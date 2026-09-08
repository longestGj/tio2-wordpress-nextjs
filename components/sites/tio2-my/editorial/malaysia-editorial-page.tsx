import type {ReactNode} from 'react'
import {Inter} from 'next/font/google'
import localFont from 'next/font/local'
import type {EditorialDto} from '@/lib/editorial/editorial-types'
import chrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {MalaysiaGlobalHeader,MalaysiaGlobalFooter} from '../malaysia-global-chrome'
import {EditorialAnchorFocus} from './editorial-anchor-focus'
import './editorial-base.css'

const editorialFont = Inter({subsets:['latin'],weight:['400','500','600','700'],display:'swap',variable:'--font-my-shared'})
const approvedVariableFont=localFont({src:'./fonts/Inter-Variable.ttf',weight:'100 900',style:'normal',display:'swap',variable:'--font-my-shared'})

export function MalaysiaEditorialPage({page,structuredData}:{readonly page:EditorialDto;readonly structuredData?:ReactNode}) {
  const fiveConsumer=['MARKET-EU-DE','MARKET-EU-IT','PRODUCT-PROC-SU','RES-R706','RES-CHEMOURS'].includes(page.identity.pageId)
  return <div className={fiveConsumer?approvedVariableFont.variable:editorialFont.variable} data-editorial-page={page.identity.pageId} data-page-id={page.identity.pageId} data-site-scope="tio2-my" data-site-id="tio2-my">
    {structuredData}
    <MalaysiaGlobalHeader chrome={chrome} currentPageId={{resources:'RES-000',applications:'APP-000',markets:'MARKET-000',products:'PRODUCT-000'}[page.identity.section]} sourcePageId={page.identity.pageId}/>
    <main id="main-content" className={page.mainClass} dangerouslySetInnerHTML={{__html:page.bodyHtml}}/>
    <EditorialAnchorFocus pageId={page.identity.pageId}/>
    <MalaysiaGlobalFooter chrome={chrome} sourcePageId={page.identity.pageId}/>
  </div>
}
