import Link from 'next/link';
import {InnerPage} from '../../components/site-chrome';
import {resources} from '../../lib/prototype-data';

export default function ResourcesPage() {
  return (
    <InnerPage
      eyebrow="Technical resource hub"
      title="Use the right question to frame the next test."
      intro="Ten practical guides connect material fundamentals, performance indicators and application testing to a controlled comparison plan."
    >
      <section className="content-shell">
        <div className="content-intro">
          <p className="section-kicker">Technical library</p>
          <h2>Understand the input. Control the comparison. Validate the outcome.</h2>
        </div>
        <div className="resource-list">
          {resources.map(([number, cluster, title]) => (
            <Link className="resource-row" href={number === '07' ? '/resources/article-07' : '/contact'} key={number}>
              <span className="number">{number}</span>
              <span className="cluster">{cluster}</span>
              <h2>{title}</h2>
              <span className="arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>
    </InnerPage>
  );
}
