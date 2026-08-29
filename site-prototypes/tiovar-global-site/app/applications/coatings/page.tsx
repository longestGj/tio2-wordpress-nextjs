import type {Metadata} from 'next';
import Link from 'next/link';
import {InnerPage} from '../../../components/site-chrome';

export const metadata: Metadata = {
  title: 'Titanium Dioxide for Coatings | TIOVAR',
  description: 'Frame titanium dioxide evaluation for architectural, industrial, automotive and protective coatings.',
  openGraph: {images: []},
  twitter: {images: []},
};

const paths = [
  ['Water-based paint', 'Balance dispersion, viscosity, hiding, color, gloss and storage stability.', 'TP-C120 · TP-C100 · TP-C110'],
  ['High-PVC flat paint', 'Evaluate dry hiding together with oil absorption, binder demand and film integrity.', 'TP-C200'],
  ['Automotive coatings', 'Control film build, gloss, color retention, weathering and application appearance.', 'TP-C300 · TP-C310 · TP-C400'],
  ['Protective & exterior', 'Match binder, cure and exposure protocol before comparing durability direction.', 'TP-C400 · TP-C410'],
  ['Electrophoretic coatings', 'Examine ion-sensitive behavior and complete bath compatibility.', 'TP-C050'],
  ['Powder & coil coatings', 'Compare processing, dispersion, appearance and durability in the actual system.', 'Discuss application'],
] as const;

export default function CoatingsPage() {
  return (
    <InnerPage
      eyebrow="Applications · Coatings"
      title="Select TiO₂ around the complete coating system."
      intro="Binder chemistry, PVC, dispersion, application, cure and exposure conditions determine which pigment direction deserves a controlled trial."
    >
      <section className="content-shell">
        <div className="content-intro"><p className="section-kicker">Choose a path</p><h2>Different coatings create different selection priorities.</h2></div>
        <div className="catalog-grid">
          {paths.map(([title, copy, products]) => (
            <Link className="product-card" href={title === 'Water-based paint' ? '/products/tp-c120' : '/contact'} key={title}>
              <span className="card-family">{products}</span><h2>{title}</h2><p>{copy}</p><span className="card-link"><span>Explore application</span><span>↗</span></span>
            </Link>
          ))}
        </div>
      </section>
      <section className="split-section alt">
        <p className="split-label">Evaluation framework</p>
        <div className="split-content">
          <h2>Keep the control constant before changing the formulation.</h2>
          <ol className="steps">
            <li>Define coating type, binder, PVC, pigment loading and target film properties.</li>
            <li>Use a matched control and hold dispersion conditions constant for the first comparison.</li>
            <li>Measure rheology, grind quality, opacity, color, gloss and application appearance.</li>
            <li>Adjust only where the candidate response justifies a controlled formulation change.</li>
            <li>Validate storage, cure, mechanical behavior and exposure performance in the finished coating.</li>
          </ol>
        </div>
      </section>
    </InnerPage>
  );
}
