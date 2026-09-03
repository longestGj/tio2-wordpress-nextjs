import type {ReactNode} from 'react'
import Link from 'next/link'
import {MalaysiaGlobalFooter,MalaysiaGlobalHeader} from '@/components/sites/tio2-my/malaysia-global-chrome'
import type {MalaysiaSamplePrefill} from '@/lib/request-sample/malaysia-request-sample-prefill'
import type {MalaysiaRequestSamplePageDto} from '@/lib/wordpress/request-sample-v01-types'
import {MalaysiaRequestSampleForm} from './malaysia-request-sample-form'
import styles from './malaysia-request-sample-page.module.css'

export function MalaysiaRequestSamplePage({page,prefill,structuredData}:{readonly page:MalaysiaRequestSamplePageDto;readonly prefill:MalaysiaSamplePrefill;readonly structuredData:ReactNode}){
  return <div className={styles.site} data-site-scope="tio2-my" data-page-id="CONV-SAMPLE"><MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="CONV-SAMPLE" sourcePageId="CONV-SAMPLE"/><main className={styles.main}>
    <nav aria-label="Breadcrumb" className={styles.breadcrumb} data-module="breadcrumb"><Link href="/">Home</Link><span aria-hidden="true"> / </span><span aria-current="page">Request a Sample</span></nav>
    <section className={styles.hero} data-module="hero" aria-labelledby="sample-h1"><div><p className={styles.eyebrow}>{page.hero.eyebrow}</p><h1 id="sample-h1">{page.hero.h1}</h1><p className={styles.heroBody}>{page.hero.body}</p></div><ol aria-label="Sample request overview">{page.hero.stages.map((stage,index)=><li key={stage}><span>{String(index+1).padStart(2,'0')}</span>{stage}</li>)}</ol></section>
    <MalaysiaRequestSampleForm page={page} prefill={prefill}/>
    <section className={styles.review} data-module="human-review" aria-labelledby="sample-review-heading"><div><p className={styles.eyebrow}>{page.humanReview.eyebrow}</p><h2 id="sample-review-heading">{page.humanReview.heading}</h2></div><ol>{page.humanReview.steps.map((step,index)=><li key={step.title}><span>{String(index+1).padStart(2,'0')}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol><p className={styles.reviewNote}>{page.humanReview.note}</p></section>
    <section className={styles.faq} data-module="faq" aria-labelledby="sample-faq-heading"><div><p className={styles.eyebrow}>{page.faq.eyebrow}</p><h2 id="sample-faq-heading">{page.faq.heading}</h2><p>{page.faq.intro}</p></div><div>{page.faq.items.map((item,index)=><details key={item.question} open={index===0}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div></section>
  </main><MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="CONV-SAMPLE"/>{structuredData}</div>
}
