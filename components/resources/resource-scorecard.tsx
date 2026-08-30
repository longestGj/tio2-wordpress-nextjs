import type {ResourceScorecardData} from '@/lib/resources/presentation'

import styles from './resource-page.module.css'

export function ResourceScorecard({
  scorecard,
}: {
  readonly scorecard: ResourceScorecardData
}): React.ReactNode {
  const headingId = 'resource-scorecard-heading'
  return (
    <section
      aria-labelledby={headingId}
      className={`${styles.scorecard} ${styles.fullWidth}`}
      data-resource-section="scorecard"
      id="resource-scorecard"
    >
      <p className={styles.eyebrow}>Measurement and judgment criteria</p>
      <h2 id={headingId}>{scorecard.heading}</h2>
      <div className={styles.scorecardDesktop} data-resource-scorecard-desktop>
        <div
          aria-labelledby={headingId}
          className={styles.tableRegion}
          role="region"
          tabIndex={0}
        >
          <table className={styles.comparisonTable}>
            <caption>{scorecard.heading}</caption>
            <thead>
              <tr>
                {scorecard.columns.map((column) => (
                  <th key={column} scope="col">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scorecard.rows.map((row) => (
                <tr key={row.join('\u0000')}>
                  <th scope="row">{row[0]}</th>
                  {row.slice(1).map((cell, index) => (
                    <td key={`${scorecard.columns[index + 1]}-${cell}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={styles.scorecardMobile} data-resource-scorecard-mobile>
        {scorecard.rows.map((row) => (
          <details key={row.join('\u0000')}>
            <summary>{row[0]}</summary>
            <dl>
              {scorecard.columns.slice(1).map((column, index) => (
                <div key={column}>
                  <dt>{column}</dt>
                  <dd>{row[index + 1]}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
    </section>
  )
}
