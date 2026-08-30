import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import styles from './resource-page.module.css'

export function ComparisonTable({
  table,
  variant = 'table',
  grouped = false,
}: {
  readonly table: TechnicalResourcePageDto['comparisonTable']
  readonly variant?: 'table' | 'examples'
  readonly grouped?: boolean
}) {
  if (!table) return null
  if (variant === 'examples') {
    return (
      <section
        aria-labelledby="resource-comparison-table-heading"
        className={styles.comparisonExamples}
        data-resource-comparison
        data-resource-section={grouped ? undefined : 'comparison-table'}
        id="resource-comparison"
      >
        <h2 id="resource-comparison-table-heading">Comparison Table</h2>
        <div className={styles.exampleList}>
          {table.rows.map((row, rowIndex) => (
            <article className={styles.exampleCard} data-resource-example key={`${rowIndex}-${row.join('\u0000')}`}>
              <dl>
                {table.columns.map((column, columnIndex) => (
                  <div key={`${column}-${row[columnIndex]}`}>
                    <dt>{column}</dt>
                    <dd>{row[columnIndex]}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>
    )
  }
  return (
    <section
      data-resource-comparison
      data-resource-section={grouped ? undefined : 'comparison-table'}
      aria-labelledby="resource-comparison-table-heading"
      className={styles.comparisonTableSection}
      id="resource-comparison"
    >
      <h2 id="resource-comparison-table-heading">Comparison Table</h2>
      <p id="resource-comparison-table-hint">
        On narrow screens, scroll horizontally to compare every column.
      </p>
      <div
        className={styles.tableRegion}
        role="region"
        aria-labelledby="resource-comparison-table-heading"
        aria-describedby="resource-comparison-table-hint"
        tabIndex={0}
      >
        <table className={styles.comparisonTable}>
          <caption>Comparison Table</caption>
          <thead>
            <tr>
              {table.columns.map((column, index) => (
                <th key={`${index}-${column}`} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row.join('\u0000')}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cellIndex}-${cell}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
