'use client'

import {useState} from 'react'

import styles from './document-tds-page.module.css'

interface FaqItem {
  readonly question: string
  readonly answer: string
}

export function DocumentTdsFaq({items}: {readonly items: readonly FaqItem[]}) {
  const [open, setOpen] = useState<number | null>(null)
  return <div className={styles.faqList}>
    {items.map((item, index) => {
      const expanded = open === index
      const answerId = `doc-tds-answer-${index}`
      return <article className={styles.faqItem} key={item.question}>
        <h3>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={answerId}
            onClick={() => setOpen(expanded ? null : index)}
          >
            <span>{item.question}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span>
          </button>
        </h3>
        <div id={answerId} hidden={!expanded}><p>{item.answer}</p></div>
      </article>
    })}
  </div>
}
