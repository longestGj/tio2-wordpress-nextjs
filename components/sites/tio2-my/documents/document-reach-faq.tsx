import styles from './document-reach-page.module.css'

interface FaqItem {readonly question: string; readonly answer: string}

export function DocumentReachFaq({items}: {readonly items: readonly FaqItem[]}) {
  return <div className={styles.faqList}>
    {items.map((item) => <details className={styles.faqItem} key={item.question}>
      <summary><span>{item.question}</span><span aria-hidden="true">+</span></summary>
      <div><p>{item.answer}</p></div>
    </details>)}
  </div>
}
