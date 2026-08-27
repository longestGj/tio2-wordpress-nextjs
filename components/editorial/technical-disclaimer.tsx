interface TechnicalDisclaimerProps {
  readonly html: string
  readonly headingId: string
}

export function TechnicalDisclaimer({html, headingId}: TechnicalDisclaimerProps) {
  return (
    <section
      data-application-section="technical-disclaimer"
      aria-labelledby={headingId}
    >
      <h2 id={headingId}>Technical Disclaimer</h2>
      <div dangerouslySetInnerHTML={{__html: html}} />
    </section>
  )
}
