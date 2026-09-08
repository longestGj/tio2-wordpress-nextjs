import type {ReactNode} from 'react'
import type {MalaysiaPolandMarketPageDto, PolandAction} from '@/lib/wordpress/market-page-poland-v01-types'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-poland-market-page.module.css'

function Actions({actions}: {readonly actions: readonly PolandAction[]}) {
  return <div className={styles.actions}>{actions.map((action,index) => {
    const kind=index>0 ? styles.support : action.targetPageId==='PRODUCT-000' ? styles.outline : styles.primary
    return <a key={action.href} className={`${styles.action} ${kind}`} href={action.href}>{action.label}</a>
  })}</div>
}

export function MalaysiaPolandMarketPage({marketPage:page,structuredData,fontClassName=''}: {
  readonly marketPage:MalaysiaPolandMarketPageDto
  readonly structuredData?:ReactNode
  readonly fontClassName?:string
}) {
  return <div className={fontClassName} data-site-id="tio2-my" data-site-scope="tio2-my" data-page-id={page.identity.pageId}>
    {structuredData}
    <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="MARKET-000" sourcePageId="MARKET-EU-PL"/>
    <main className={styles.main}>
      {page.modules.map(module => {
        const hero=module.id==='PL-01',review=module.id==='PL-03'
        return <section key={module.id} id={module.id.toLowerCase()} data-module={module.id}
          aria-labelledby={`${module.id}-heading`} className={`${styles.section} ${hero?styles.hero:''}`}>
          <div className={styles.container}>
            {hero && <nav aria-label="Breadcrumb" className={styles.breadcrumb}><ol>
              {page.breadcrumb.map((item,index) => <li key={item.targetPageId}>
                {index<page.breadcrumb.length-1 ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
              </li>)}
            </ol></nav>}
            <div className={hero?'':review?styles.review:styles.split}>
              {hero ? <h1 id={`${module.id}-heading`}>{module.heading}</h1> : <h2 id={`${module.id}-heading`}>{module.heading}</h2>}
              <div className={hero?styles.heroCopy:styles.copy}>
                {module.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
                {module.columns.length>0 && <div className={styles.columns}>
                  {module.columns.map(column=><div className={styles.column} key={column.heading}>
                    <h3>{column.heading}</h3>{column.paragraphs.map((p,index)=><p key={index}>{p}</p>)}
                  </div>)}
                </div>}
                {module.actions.length>0 && <Actions actions={module.actions}/>}
              </div>
            </div>
          </div>
        </section>
      })}
    </main>
    <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="MARKET-EU-PL"/>
  </div>
}
