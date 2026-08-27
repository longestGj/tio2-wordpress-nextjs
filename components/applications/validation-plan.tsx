import type {ApplicationPageDto} from '@/lib/applications/types'

type DecisionGuide = ApplicationPageDto['decisionGuide']

export function ValidationPlan({guide}: {readonly guide: DecisionGuide}) {
  return (
    <>
      <section
        data-application-section="validation-plan"
        aria-labelledby="application-validation-plan-heading"
      >
        <h2 id="application-validation-plan-heading">Validation Plan</h2>
        <ol>
          {guide.validationPlan.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ol>
      </section>
      <section
        data-application-section="customer-inputs"
        aria-labelledby="application-customer-inputs-heading"
      >
        <h2 id="application-customer-inputs-heading">Customer Inputs</h2>
        <ul>
          {guide.customerInputs.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  )
}
