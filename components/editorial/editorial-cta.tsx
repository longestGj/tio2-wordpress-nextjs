interface EditorialCtaItem {
  readonly kind: string
  readonly label: string
  readonly href: string
}

interface EditorialCtaProps {
  readonly ctas: readonly EditorialCtaItem[]
  readonly headingId: string
}

export function EditorialCta({ctas, headingId}: EditorialCtaProps) {
  return (
    <section data-editorial-section="cta-group" aria-labelledby={headingId}>
      <h2 id={headingId}>Plan the next evaluation step</h2>
      <ul>
        {ctas.map((cta) => (
          <li key={cta.kind}>
            <a href={cta.href}>{cta.label}</a>
          </li>
        ))}
      </ul>
    </section>
  )
}
