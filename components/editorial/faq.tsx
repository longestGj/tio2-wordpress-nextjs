interface EditorialFaqItem {
  readonly question: string
  readonly answerHtml: string
}

interface EditorialFaqProps {
  readonly faqs: readonly EditorialFaqItem[]
  readonly headingId: string
}

export function EditorialFaq({faqs, headingId}: EditorialFaqProps) {
  return (
    <section data-editorial-section="faq" aria-labelledby={headingId}>
      <p>Common evaluation questions</p>
      <h2 id={headingId}>Frequently Asked Questions</h2>
      <ol>
        {faqs.map((faq, index) => (
          <li data-editorial-faq-item key={`${index}-${faq.question}`}>
            <article>
              <h3>{faq.question}</h3>
              <div dangerouslySetInnerHTML={{__html: faq.answerHtml}} />
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}
