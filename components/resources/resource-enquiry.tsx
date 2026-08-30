import type {ResourcePresentationMode} from '@/lib/resources/presentation'
import type {selectResourceCtas} from '@/lib/resources/presentation-policy'

import styles from './resource-page.module.css'

type ResourceCtaSelection = ReturnType<typeof selectResourceCtas>

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
          <a className={styles.primaryCta} href={ctas.discuss.href}>
            {ctas.discuss.label}
          </a>
          {ctas.requestTds ? (
            <a className={styles.secondaryCta} href={ctas.requestTds.href}>
              {ctas.requestTds.label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}
