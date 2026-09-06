'use client'

import {useState, useSyncExternalStore} from 'react'

import type {MalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-types'

import styles from './malaysia-resource-hub.module.css'

export function ResourceFaq({questions}: {readonly questions: MalaysiaResourceHubDto['buyerQuestions']}) {
  const enhanced = useSyncExternalStore(() => () => undefined, () => true, () => false)
  const [openId, setOpenId] = useState<string | null>(questions[0]?.id ?? null)
  return (
    <div className={styles.faqList}>
      {questions.map((item) => {
        const open = !enhanced || item.id === openId
        const answerId = `resource-faq-answer-${item.id}`
        return (
          <article key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={answerId}
                onClick={() => setOpenId((current) => current === item.id ? null : item.id)}
              >
                <span>{item.question}</span><span aria-hidden="true">{open ? '−' : '+'}</span>
              </button>
            </h3>
            <div id={answerId} hidden={!open}><p>{item.answer}</p></div>
          </article>
        )
      })}
    </div>
  )
}
