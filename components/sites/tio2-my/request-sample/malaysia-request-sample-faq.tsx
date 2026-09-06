'use client'

import {useState} from 'react'
import styles from './malaysia-request-sample-page.module.css'

interface FaqItem{readonly question:string;readonly answer:string}

export function MalaysiaRequestSampleFaq({items}:{readonly items:readonly FaqItem[]}){
  const [expanded,setExpanded]=useState(()=>items.map((_,index)=>index===0))
  return <div>{items.map((item,index)=>{const triggerId=`sample-faq-trigger-${index+1}`;const panelId=`sample-faq-panel-${index+1}`;const open=expanded[index]??false;return <div className={styles.faqItem} key={item.question}>
    <button className={styles.faqButton} type="button" id={triggerId} aria-expanded={open} aria-controls={panelId} onClick={()=>setExpanded((current)=>current.map((value,itemIndex)=>itemIndex===index?!value:value))}>{item.question}<span aria-hidden="true">{open?'−':'+'}</span></button>
    <div className={styles.faqPanel} id={panelId} role="region" aria-labelledby={triggerId} hidden={!open}><p>{item.answer}</p></div>
  </div>})}</div>
}
