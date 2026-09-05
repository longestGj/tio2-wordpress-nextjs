import type {ReactNode} from 'react'
import type {MalaysiaUkMarketPageDto} from '@/lib/wordpress/market-page-uk-v01-types'
import {MalaysiaGlobalHeader, MalaysiaGlobalFooter} from '../malaysia-global-chrome'
import styles from './malaysia-uk-market-page.module.css'

type ActionData = {readonly label: string; readonly href: string; readonly targetPageId: string}
function Action({item, kind='primary'}:{readonly item:ActionData;readonly kind?:'primary'|'secondary'|'text'}) {
  return <a className={styles[kind]} href={item.href} rel={item.targetPageId==='OFFICIAL-SOURCE'?'external noopener noreferrer':undefined}>{item.label}</a>
}
function Actions({items, secondaryFirst=false}:{readonly items:readonly ActionData[];readonly secondaryFirst?:boolean}) {
  return <div className={styles.actions}>{items.map((item,i)=><Action key={item.href} item={item} kind={i>1?'text':(i===0)!==secondaryFirst?'primary':'secondary'}/>)}</div>
}
function Section({id,children,tone='',className=''}:{readonly id:string;readonly children:ReactNode;readonly tone?:string;readonly className?:string}) {
  return <section className={[styles.section,tone?styles[tone]:''].join(' ')} data-module={id} aria-labelledby={id+'-heading'}><div className={[styles.container,className].join(' ')}>{children}</div></section>
}
function Intro({id,data}:{readonly id:string;readonly data:{readonly h2:string;readonly intro:string}}) {
  return <><h2 id={id+'-heading'}>{data.h2}</h2><p className={styles.intro}>{data.intro}</p></>
}
export function MalaysiaUkMarketPage({marketPage:p,structuredData,fontClassName=''}:{
  readonly marketPage:MalaysiaUkMarketPageDto;readonly structuredData?:ReactNode;readonly fontClassName?:string
}) {
  return <div className={fontClassName} data-site-scope="tio2-my" data-site-id="tio2-my">
    {structuredData}
    <MalaysiaGlobalHeader chrome={p.globalChrome} currentPageId="MARKET-000" sourcePageId="MARKET-UK-001"/>
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb"><ol>
        {p.breadcrumb.map((item,i)=><li key={item.targetPageId}>{i<2?<a href={item.href}>{item.label}</a>:<span aria-current="page">{item.label}</span>}</li>)}
      </ol></nav>
      <Section id="hero" className={styles.hero}>
        <div><p className={styles.eyebrow}>{p.hero.eyebrow}</p><h1 id="hero-heading">{p.hero.h1}</h1><p className={styles.lead}>{p.hero.body}</p></div>
        <div className={styles.heroActions}><Actions items={p.hero.actions}/></div>
      </Section>
      <Section id="direct-answer" tone="tint"><div className={styles.answer}>
        <h2 id="direct-answer-heading">{p.directAnswer.h2}</h2><p>{p.directAnswer.intro}</p><p className={styles.support}>{p.directAnswer.support}</p><Actions items={p.directAnswer.actions}/>
      </div></Section>
      <Section id="application-paths">
        <h2 id="application-paths" tabIndex={-1}><span id="application-paths-heading">{p.applications.h2}</span></h2><p className={styles.intro}>{p.applications.intro}</p>
        <div className={styles.applicationGrid}>{p.applications.items.map(item=><article key={item.action.targetPageId} className={styles.applicationCard}><h3>{item.title}</h3><p>{item.body}</p><Action item={item.action} kind="text"/></article>)}</div>
        <Actions items={p.applications.actions} secondaryFirst/>
      </Section>
      <Section id="representative-grades" tone="tint">
        <h2 id="representative-grades" tabIndex={-1}><span id="representative-grades-heading">{p.grades.h2}</span></h2><p className={styles.intro}>{p.grades.intro}</p>
        <div className={styles.gradeGroups}>{p.grades.groups.map((group,i)=><section className={styles.gradeGroup} key={group.title} aria-labelledby={'uk-grade-group-'+i}>
          <h3 id={'uk-grade-group-'+i}>{group.title}</h3><p>{group.intro}</p><div className={styles.gradeList}>
            {group.items.map(item=><article className={styles.gradeCard} key={item.action.targetPageId}><h4>{item.name}</h4><p>{item.application}</p><Action item={item.action} kind="text"/></article>)}
          </div></section>)}</div>
        <p className={styles.closing}>{p.grades.closing}</p><Actions items={p.grades.actions}/>
      </Section>
      <Section id="territory"><Intro id="territory" data={p.territory}/>
        <div className={styles.territoryGrid}>{p.territory.items.map(item=><article className={styles.territoryCard} key={item.title}>
          <h3>{item.title}</h3><p className={styles.territoryLabel}>{item.label}</p><p className={styles.territoryBody}>{item.body}</p>
          <div className={styles.sourceActions}>{item.actions.map(a=><Action item={a} kind="text" key={a.href}/>)}</div>
        </article>)}</div>
      </Section>
      <Section id="checklist" tone="tint"><Intro id="checklist" data={p.checklist}/>
        <ol className={styles.checklist}>{p.checklist.items.map(item=><li className={styles.checklistCard} key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.body}</p></li>)}</ol>
        <Actions items={p.checklist.actions} secondaryFirst/>
      </Section>
      <Section id="documents"><Intro id="documents" data={p.documents}/>
        <div className={styles.documents}>{p.documents.items.map(item=><article key={item.title} className={styles.documentCard}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        <p className={styles.documentSupport}>{p.documents.support}</p><Actions items={p.documents.actions}/>
      </Section>
      <Section id="origin" tone="navy" className={styles.origin}>
        <div><h2 id="origin-heading">{p.origin.h2}</h2><p>{p.origin.intro}</p><p>{p.origin.support}</p></div><Actions items={p.origin.actions}/>
      </Section>
      <Section id="trade" tone="tint">
        <div className={styles.tradeCopy}><h2 id="trade-heading">{p.trade.h2}</h2><p>{p.trade.intro}</p><p className={styles.support}>{p.trade.support}</p></div>
        <div className={styles.tradeLinks}>{p.trade.actions.map(item=><a href={item.href} rel="external noopener noreferrer" key={item.href}>{item.label}<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M10 14 21 3M10 3H3v18h18v-7"/></svg></a>)}</div>
      </Section>
      <Section id="buyer-questions" className={styles.questions}>
        <h2 id="buyer-questions-heading">{p.buyerQuestions.h2}</h2><div className={styles.faqList}>
          {p.buyerQuestions.items.map((item,i)=><details key={item.id} open={i<2}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}
        </div>
      </Section>
      <Section id="final-rfq" tone="deep" className={styles.finalRfq}>
        <div><h2 id="final-rfq-heading">{p.finalRfq.h2}</h2><p>{p.finalRfq.intro}</p></div><Actions items={p.finalRfq.actions}/>
      </Section>
    </main>
    <MalaysiaGlobalFooter chrome={p.globalChrome} sourcePageId="MARKET-UK-001"/>
  </div>
}
