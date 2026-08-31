'use client'

import {useState, useSyncExternalStore} from 'react'

import type {MalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-types'

import styles from './malaysia-product-hub.module.css'

export function ProductFaq({
  questions,
}: {
  readonly questions: MalaysiaProductHubDto['buyerQuestions']
}) {
  const enhanced = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const [openId, setOpenId] = useState<string | null>(questions[0]?.id ?? null)

  return (
    <div className={styles.faqList}>
      {questions.map((item) => {
        const open = !enhanced || item.id === openId
        const answerId = `product-faq-answer-${item.id}`
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
            <div id={answerId} hidden={!open}>
              <p>{item.answer}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
