import type {ResourcePresentationMode} from '@/lib/resources/presentation'
import type {selectResourceCtas} from '@/lib/resources/presentation-policy'

import styles from './resource-page.module.css'

type ResourceCtaSelection = ReturnType<typeof selectResourceCtas>
type ResourceCta = NonNullable<ResourceCtaSelection['discuss']>

const usefulInputsByMode: Readonly<Record<ResourcePresentationMode, readonly string[]>> = {
  hub: [
    'Question blocking the next decision',
    'Current material or candidate grades',
    'Application and process context',
    'Available test data or observations',
  ],
  'technical-explainer': [
    'Reported values and their test method',
    'Vehicle, binder or formulation type',
    'Current control or candidate grades',
    'Performance that must be protected',
  ],
  'evaluation-guide': [
    'Current grade and candidate grade',
    'Application and formulation context',
    'Process conditions and current result',
    'Test methods and acceptance limits',
  ],
}

function ResourceAction({
  cta,
  primary,
  productNames = [],
}: {
  readonly cta: ResourceCta
  readonly primary: boolean
  readonly productNames?: readonly string[]
}): React.ReactNode {
  const className = `${primary ? styles.primaryCta : styles.secondaryCta} ${
    cta.href ? '' : styles.unavailableCta
  }`
  const content = (
    <>
      <strong data-resource-action-label>{cta.label}</strong>
      {productNames.length > 0 ? (
        <small data-resource-product-context>
          {productNames.length === 1 ? 'Related Product' : 'Related Products'}:{' '}
          {productNames.join(', ')}
        </small>
      ) : null}
    </>
  )
  const attributes = {
    className,
    'data-resource-action': cta.kind,
  } as const

  return cta.href ? (
    <a {...attributes} href={cta.href}>
      {content}
    </a>
  ) : (
    <span {...attributes}>{content}</span>
  )
}

export function ResourceEnquiry({
  ctas,
  mode,
}: {
  readonly ctas: ResourceCtaSelection
  readonly mode: ResourcePresentationMode
}): React.ReactNode {
  if (!ctas.discuss) return null
  return (
    <section
      aria-labelledby="resource-enquiry-heading"
      className={`${styles.enquiry} ${styles.fullWidth}`}
      data-resource-section="cta-group"
      id="inquiry"
    >
      <div className={styles.enquiryCopy}>
        <p className={styles.eyebrow}>Technical discussion</p>
        <h2 id="resource-enquiry-heading">Discuss Your Evaluation</h2>
        <p>
          Share the decision context so the technical discussion can focus on
          the comparison inputs that matter to your application.
        </p>
      </div>
      <div className={styles.enquiryPanel}>
        <h3>Useful inputs</h3>
        <ul>
          {usefulInputsByMode[mode].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className={styles.ctaActions}>
          <ResourceAction cta={ctas.discuss} primary />
          {ctas.requestTds ? (
            <ResourceAction
              cta={ctas.requestTds}
              primary={false}
              productNames={ctas.requestTds.productNames}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
