import type {EditorialSupplyRouteDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface SupplyRouteComparisonProps {
  readonly routes: readonly EditorialSupplyRouteDto[]
}

export function SupplyRouteComparison({routes}: SupplyRouteComparisonProps) {
  return (
    <section
      className={`${styles.section} ${styles.supplySection}`}
      aria-labelledby="site-a-supply-routes-heading"
    >
      <h2 id="site-a-supply-routes-heading">Supply routes</h2>
      <div className={styles.tableScroller}>
        <table>
          <thead>
            <tr>
              <th scope="col">Route</th>
              <th scope="col">Meaning</th>
              <th scope="col">Buyer verification</th>
              <th scope="col">Documentation context</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.name}>
                <th scope="row">{route.name}</th>
                <td>{route.meaning}</td>
                <td>{route.buyerVerification}</td>
                <td>
                  <p>{route.documentationContext}</p>
                  {route.evidenceUrl ? (
                    <a href={route.evidenceUrl}>Review route evidence</a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
