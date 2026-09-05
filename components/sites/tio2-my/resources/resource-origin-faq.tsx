'use client'

import {useState, useSyncExternalStore} from 'react'

import styles from './malaysia-resource-origin-page.module.css'

interface BuyerQuestion {
  readonly id: string
  readonly question: string
  readonly answer: string
}

export function ResourceOriginFaq({questions}: {readonly questions: readonly BuyerQuestion[]}) {
  const enhanced = useSyncExternalStore(() => () => undefined, () => true, () => false)
  const [openId, setOpenId] = useState<string | null>(questions[0]?.id ?? null)
  return (
    <div className={styles.faqList}>
      {questions.map((item) => {
        const open = !enhanced || item.id === openId
        const answerId = `res-origin-answer-${item.id}`
        return (
          <article key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={answerId}
                onClick={() => setOpenId((current) => current === item.id ? null : item.id)}
              >
                <span>{item.question}</span>
                <span aria-hidden="true">{open ? '−' : '+'}</span>
              </button>
            </h3>
            <div id={answerId} hidden={!open}><p>{item.answer}</p></div>
          </article>
        )
      })}
    </div>
  )
}
