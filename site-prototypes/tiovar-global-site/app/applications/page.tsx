import Link from 'next/link';
import {InnerPage} from '../../components/site-chrome';
import {applicationFamilies} from '../../lib/prototype-data';

export default function ApplicationsPage() {
  return (
    <InnerPage
      eyebrow="Application-led selection"
      title="Begin with the system you are making."
      intro="Define the material system, manufacturing route and finished-product requirement before comparing titanium dioxide candidates."
    >
      <section className="content-shell">
        <div className="content-intro">
          <p className="section-kicker">Application families</p>
          <h2>Seven starting paths. One disciplined evaluation approach.</h2>
        </div>
        <div className="family-grid">
          {applicationFamilies.map(([title, description, count]) => (
            <Link className="family-card" href={title === 'Coatings' ? '/applications/coatings' : '/contact'} key={title}>
              <div className="card-meta"><span>{count}</span><span>Explore ↗</span></div>
              <div><h2>{title}</h2><p>{description}</p></div>
            </Link>
          ))}
        </div>
      </section>
    </InnerPage>
  );
}
