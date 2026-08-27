interface DirectAnswerProps {
  readonly html: string
  readonly headingId: string
}

export function DirectAnswer({html, headingId}: DirectAnswerProps) {
  return (
    <section
      data-application-section="direct-answer"
      aria-labelledby={headingId}
    >
      <p>Decision guidance</p>
      <h2 id={headingId}>Direct Answer</h2>
      <div dangerouslySetInnerHTML={{__html: html}} />
    </section>
  )
}
