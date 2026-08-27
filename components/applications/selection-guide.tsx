import type {ApplicationPageDto} from '@/lib/applications/types'

type DecisionGuide = ApplicationPageDto['decisionGuide']

export function CustomerContext({guide}: {readonly guide: DecisionGuide}) {
  return (
    <section
      data-application-section="customer-context"
      aria-labelledby="application-customer-context-heading"
    >
      <h2 id="application-customer-context-heading">Customer Context</h2>
      <p>{guide.context}</p>
      <h3>Buyer problem</h3>
      <p>{guide.buyerProblem}</p>
    </section>
  )
}

export function SelectionFactors({guide}: {readonly guide: DecisionGuide}) {
  return (
    <section
      data-application-section="selection-factors"
      aria-labelledby="application-selection-factors-heading"
    >
      <h2 id="application-selection-factors-heading">Selection Factors</h2>
      <ul>
        {guide.selectionFactors.map((factor, index) => (
          <li key={`${index}-${factor}`}>{factor}</li>
        ))}
      </ul>
    </section>
  )
}

export function PowderDataLimitation({guide}: {readonly guide: DecisionGuide}) {
  return (
    <section
      data-application-section="powder-data-limitation"
      aria-labelledby="application-powder-data-heading"
    >
      <h2 id="application-powder-data-heading">Powder-data Limitation</h2>
      <p>{guide.powderDataLimits}</p>
    </section>
  )
}
