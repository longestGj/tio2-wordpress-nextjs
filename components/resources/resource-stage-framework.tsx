import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import styles from './resource-page.module.css'

type StageTable = NonNullable<TechnicalResourcePageDto['comparisonTable']>

function StageDetails({row, columns}: {readonly row: readonly string[]; readonly columns: readonly string[]}) {
  return (
    <details data-resource-stage-mobile>
      <summary>{row[0]}</summary>
      <dl>
        {columns.slice(1).map((column, index) => (
          <div key={column}>
            <dt>{column}</dt>
            <dd>{row[index + 1]}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

export function ResourceStageFramework({
  table,
}: {
  readonly table: StageTable
}): React.ReactNode {
  return (
    <section
      aria-labelledby="resource-stage-framework-heading"
      className={`${styles.stageFramework} ${styles.mediumWidth}`}
      data-resource-comparison
      data-resource-section="stage-framework"
      id="resource-stage-framework"
    >
      <p className={styles.eyebrow}>Phased evaluation</p>
      <h2 id="resource-stage-framework-heading">Six-stage decision path</h2>
      <div className={styles.stageDesktop}>
        {table.rows.map((row) => (
          <article data-resource-stage key={row.join('\u0000')}>
            <h3>{row[0]}</h3>
            <dl>
              {table.columns.slice(1).map((column, index) => (
                <div key={column}>
                  <dt>{column}</dt>
                  <dd>{row[index + 1]}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      <div className={styles.stageMobile}>
        {table.rows.map((row) => (
          <StageDetails columns={table.columns} key={row.join('\u0000')} row={row} />
        ))}
      </div>
    </section>
  )
}
