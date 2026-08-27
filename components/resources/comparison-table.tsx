import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import styles from './resource-page.module.css'

export function ComparisonTable({
  table,
}: {
  readonly table: TechnicalResourcePageDto['comparisonTable']
}) {
  if (!table) return null
  return (
    <section
      data-resource-section="comparison-table"
      aria-labelledby="resource-comparison-table-heading"
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
