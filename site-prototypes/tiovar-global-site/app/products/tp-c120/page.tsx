import type {Metadata} from 'next';
import Link from 'next/link';
import {SiteFooter, SiteHeader} from '../../../components/site-chrome';

export const metadata: Metadata = {
  title: 'TP-C120 Premium TiO₂ for Water-Based Emulsion Paint | TIOVAR',
  description: 'Evaluate TP-C120 rutile TiO₂ for water-based interior and exterior emulsion paint.',
  openGraph: {images: []},
  twitter: {images: []},
};

const priorities = [
  ['01', 'Viscosity direction', 'Compare slurry and finished-paint viscosity after optimizing dispersant demand at matched solids.'],
  ['02', 'Hiding power', 'Measure wet and dry opacity at the intended pigment loading and film thickness.'],
  ['03', 'Tone and whiteness', 'Compare dry L*, dry b*, CBU and visual color against the approved coating target.'],
  ['04', 'Gloss', 'Measure initial gloss after the selected dispersion, application and cure procedure.'],
  ['05', 'Durability', 'Validate scrub, washability and exterior exposure performance required by the finished paint.'],
] as const;

const properties = [
  ['TiO₂ content', '95', '%'], ['Rutile content', '99.9', '%'],
  ['Dry L*', '99.4', '—'], ['Dry b*', '1.00', '—'],
  ['Specific gravity', '4.1', 'g/cm³'], ['pH', '7.5', '—'],
  ['Carbon black undertone', '14.0', 'index'], ['Oil absorption', '17', 'g/100 g'],
  ['Mean particle size', '0.27', 'µm'],
] as const;

export default function ProductDetailPage() {
  return (
    <>
      <section className="product-detail-hero">
        <SiteHeader />
        <div className="product-title-grid">
          <div>
            <p className="eyebrow"><span />Premium water-based coatings · TP-C120</p>
            <h1>Rutile TiO₂ for high-end emulsion paint.</h1>
          </div>
          <div className="product-summary">
            <p>TP-C120 is a chloride-process rutile pigment for interior and exterior wall coatings where viscosity, hiding, tone, gloss and durability need to be evaluated together.</p>
            <Link className="button button-primary" href="/request-tds">Request the TDS <span>↗</span></Link>
          </div>
        </div>
        <div className="product-snapshot">
          <div className="snapshot-item"><span>Product type</span><strong>Rutile titanium dioxide pigment</strong></div>
          <div className="snapshot-item"><span>Process</span><strong>Chloride process</strong></div>
          <div className="snapshot-item"><span>Primary application</span><strong>Water-based wall emulsion paint</strong></div>
          <div className="snapshot-item"><span>Positioning</span><strong>Premium</strong></div>
        </div>
      </section>

      <section className="split-section">
        <p className="split-label">01 · Selection check</p>
        <div className="split-content">
          <h2>When TP-C120 belongs on the shortlist.</h2>
          <div className="prose">
            <p>Consider TP-C120 when developing water-based interior or exterior wall emulsion paint and relatively low slurry or paint viscosity is an important evaluation direction.</p>
            <p>Discuss the application first when the binder, PVC range, dispersant package or solids target is not fixed—or when viscosity must be balanced against hiding, gloss and storage stability.</p>
          </div>
        </div>
      </section>

      <section className="split-section alt">
        <p className="split-label">02 · Performance priorities</p>
        <div className="split-content">
          <h2>Evaluate the properties as a connected system.</h2>
          <div className="priority-grid">
            {priorities.map(([number, title, copy]) => (
              <div className="priority-card" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="split-section">
        <p className="split-label">03 · Typical properties</p>
        <div className="split-content">
          <h2>Reference values for initial screening.</h2>
          <table className="property-table">
            <thead><tr><th>Property</th><th>Typical value</th><th>Unit</th></tr></thead>
            <tbody>{properties.map(([name, value, unit]) => <tr key={name}><td>{name}</td><td>{value}</td><td>{unit}</td></tr>)}</tbody>
          </table>
          <p className="prototype-note">Typical values are reference data, not guaranteed specifications. Confirm the applicable method and commercial specification during evaluation.</p>
        </div>
      </section>

      <section className="split-section alt">
        <p className="split-label">04 · Validation plan</p>
        <div className="split-content">
          <h2>Move from powder data to finished-paint evidence.</h2>
          <ol className="steps">
            <li>Define binder chemistry, PVC, solids, dispersant package, pigment loading and application method.</li>
            <li>Compare slurry and finished-paint viscosity across the agreed shear range.</li>
            <li>Optimize dispersant demand before comparing hiding, gloss or storage stability.</li>
            <li>Measure wet and dry opacity, dry color, CBU and visual whiteness.</li>
            <li>Confirm gloss, scrub, washability and film appearance after the selected cure.</li>
            <li>Run exterior exposure or accelerated weathering for exterior formulations.</li>
          </ol>
        </div>
      </section>

      <section className="spotlight-section">
        <div className="spotlight-meta"><p className="section-kicker light">Technical documentation</p><span>Available on request</span></div>
        <div className="spotlight-grid">
          <div><p className="product-code">TP-C120</p><h2>Ready to plan a controlled formulation trial?</h2></div>
          <div className="spotlight-copy"><p>Share the binder, PVC range, viscosity target, application and destination market so the discussion can focus on the right evaluation conditions.</p><Link href="/request-tds">Request TDS and technical discussion →</Link></div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
