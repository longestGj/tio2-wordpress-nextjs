import Link from 'next/link';
import {InnerPage} from '../../components/site-chrome';
import {products} from '../../lib/prototype-data';

const filters = ['All products', 'Coatings', 'Plastics', 'Printing inks', 'Decorative paper', 'Functional'];

export default function ProductsPage() {
  return (
    <InnerPage
      eyebrow="Product portfolio · 25 grades"
      title="A focused portfolio for different material systems."
      intro="Start with the application and performance priorities, then use the portfolio to build a shortlist for controlled evaluation."
    >
      <section className="content-shell compact">
        <div className="content-intro">
          <p className="section-kicker">Explore the range</p>
          <h2>Product data is a starting point. Application fit is the decision.</h2>
        </div>
        <div className="filter-row" aria-label="Prototype product filters">
          {filters.map((filter, index) => <span className={index === 0 ? 'filter-pill active' : 'filter-pill'} key={filter}>{filter}</span>)}
        </div>
        <div className="catalog-grid">
          {products.map(([id, family, application]) => (
            <Link className="product-card" href={id === 'TP-C120' ? '/products/tp-c120' : '/contact'} key={id}>
              <span className="card-family">{family}</span>
              <h2>{id}</h2>
              <p>{application}</p>
              <span className="card-link"><span>{id === 'TP-C120' ? 'View product' : 'Discuss this grade'}</span><span>↗</span></span>
            </Link>
          ))}
        </div>
      </section>
    </InnerPage>
  );
}
