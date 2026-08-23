import type {HomepageMetricDto} from '@/lib/wordpress/homepage-types'
import styles from './homepage.module.css'

interface CompanyMetricsProps {
  readonly metrics: readonly HomepageMetricDto[]
}

export function CompanyMetrics({metrics}: CompanyMetricsProps) {
  return (
    <section className={styles.metrics} aria-label="Company metrics">
      <dl className={styles.metricGrid}>
        {metrics.map((metric) => (
          <div className={styles.metric} key={`${metric.value}-${metric.label}`}>
            <dt>{metric.label}</dt>
            <dd>
              <strong>{metric.value}</strong>
              {metric.unit ? <span>{metric.unit}</span> : null}
            </dd>
            {metric.context ? <dd>{metric.context}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  )
}
