import type {ApplicationPageDto} from '@/lib/applications/types'

import styles from './application-page.module.css'

type DecisionGuide = ApplicationPageDto['decisionGuide']

export function CustomerContext({
  guide,
  heading = 'Understand the complete application system',
}: {
  readonly guide: DecisionGuide
  readonly heading?: string
}) {
  return (
    <section
      className={`${styles.section} ${styles.wrap} ${styles.contextSection}`}
      data-application-section="customer-context"
      aria-labelledby="application-customer-context-heading"
    >
      <div>
        <p className={styles.eyebrow}>Application context</p>
        <h2 id="application-customer-context-heading">{heading}</h2>
        <p>{guide.context}</p>
      </div>
      <aside>
        <h3>What to Define Before Testing</h3>
        <p>{guide.buyerProblem}</p>
      </aside>
    </section>
  )
}

export function SelectionFactors({
  guide,
  mode,
  includeEvidenceNote = false,
  heading,
  factorLimit,
  technicalNote,
  boundaryNote,
  boundaryCta,
}: {
  readonly guide: DecisionGuide
  readonly mode: ApplicationPageDto['identity']['level']
  readonly includeEvidenceNote?: boolean
  readonly heading?: string
  readonly factorLimit?: number
  readonly technicalNote?: Readonly<{heading: string; body: string}>
  readonly boundaryNote?: ApplicationPageDto['bodySections'][number]
  readonly boundaryCta?: ApplicationPageDto['ctas'][number]
}) {
  const visibleFactors = guide.selectionFactors.slice(0, factorLimit)

  return (
    <section
      id="selection"
      className={`${styles.section} ${styles.soft}`}
      data-application-section="selection-factors"
      aria-labelledby="application-selection-factors-heading"
    >
      <div className={styles.wrap}>
        <div className={styles.selectionGrid}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Selection factors</p>
            <h2 id="application-selection-factors-heading">
              {heading ??
                (mode === 'detail'
                  ? 'What to Evaluate'
                  : 'What Controls the First Screen')}
            </h2>
            {mode !== 'detail' ? <p>{guide.context}</p> : null}
            {includeEvidenceNote ? <p>{guide.powderDataLimits}</p> : null}
          </div>
          <ol className={styles.factorList}>
            {visibleFactors.map((factor, index) => (
              <li key={`${index}-${factor}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{factor}</p>
              </li>
            ))}
          </ol>
        </div>
        {technicalNote || boundaryNote ? (
          <div className={styles.selectionNotes}>
            {technicalNote ? (
              <aside className={styles.technicalNote}>
                <h3>{technicalNote.heading}</h3>
                <p>{technicalNote.body}</p>
              </aside>
            ) : null}
            {boundaryNote ? (
              <aside className={styles.boundaryNote}>
                <h3>{boundaryNote.heading}</h3>
                <div dangerouslySetInnerHTML={{__html: boundaryNote.html}} />
                {boundaryCta ? (
                  <a href={boundaryCta.href}>{boundaryCta.label}</a>
                ) : null}
              </aside>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function PowderDataLimitation({guide}: {readonly guide: DecisionGuide}) {
  return (
    <section
      className={`${styles.section} ${styles.wrap} ${styles.powderNote}`}
      data-application-section="powder-data-limitation"
      aria-labelledby="application-powder-data-heading"
    >
      <p className={styles.eyebrow}>Evidence boundary</p>
      <h2 id="application-powder-data-heading">Why powder data is not enough</h2>
      <p>{guide.powderDataLimits}</p>
    </section>
  )
}
