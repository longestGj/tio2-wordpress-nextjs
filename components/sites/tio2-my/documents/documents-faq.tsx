'use client'

import {useState} from 'react'

import type {MalaysiaDocumentsHubDto} from '@/lib/wordpress/documents-hub-v01-types'
import styles from './malaysia-documents-hub.module.css'

export function DocumentsFaq({items}: {readonly items: MalaysiaDocumentsHubDto['buyerQuestions']['items']}) {
  const [openId, setOpenId] = useState<string | null>(null)
  return <div className={styles.faqList}>{items.map((item) => {
    const open = item.id === openId
    const answerId = `documents-faq-answer-${item.id}`
    const questionId = `documents-faq-question-${item.id}`
    return <article key={item.id}>
      <h3><button id={questionId} type="button" data-faq-question aria-expanded={open} aria-controls={answerId} onClick={() => setOpenId((id) => id === item.id ? null : item.id)}>
        <span>{item.question}</span><span aria-hidden="true">{open ? '−' : '+'}</span>
      </button></h3>
      <div id={answerId} data-faq-answer role="region" aria-labelledby={questionId} hidden={!open}><p>{item.answer}</p></div>
    </article>
  })}</div>
}
