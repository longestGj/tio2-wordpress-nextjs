import type {Metadata} from 'next';
import Link from 'next/link';
import {SiteFooter, SiteHeader} from '../../../components/site-chrome';

export const metadata: Metadata = {
  title: 'How to Evaluate a Titanium Dioxide Alternative Grade | TIOVAR',
  description: 'A staged, controlled framework for evaluating an alternative titanium dioxide grade.',
  openGraph: {images: []},
  twitter: {images: []},
};

export default function AlternativeGradeArticle() {
  return (
    <>
      <div className="inner-hero editorial-hero">
        <SiteHeader />
        <div className="inner-hero-copy">
          <p className="eyebrow"><span />Technical guide · Grade replacement</p>
          <h1>How to evaluate a titanium dioxide alternative grade.</h1>
          <p>Use a controlled, staged comparison—not a quick match of powder properties—to determine whether a candidate can meet the finished-product requirement.</p>
        </div>
      </div>
      <article className="article-shell">
        <aside className="article-aside">
          <strong>In this guide</strong>
          01 · Define the control<br/>02 · Screen documents<br/>03 · Same-formulation test<br/>04 · Controlled adjustment<br/>05 · Production trial<br/>06 · Final approval
        </aside>
        <div className="article-body">
          <h2>The short answer</h2>
          <p>An alternative grade is not established by similar TiO₂ content, process route or a few typical values. Define the current control and acceptance limits first. Then move through document screening, a one-variable lab comparison, justified adjustment, production-representative validation and finished-product approval.</p>
          <h2>Why a staged process matters</h2>
          <p>Surface chemistry, dispersion, formulation interactions and processing conditions can create different results even when two powders look similar on paper. A staged approach separates material response from formulation and process changes, making the evidence easier to interpret.</p>
          <h2>A six-stage evaluation path</h2>
          <ol className="steps">
            <li><strong>Define the current control.</strong> Record the approved pigment, loading, formulation, process window, test methods and acceptance criteria.</li>
            <li><strong>Screen the candidate.</strong> Review product identity, application direction, typical properties and documented limits before starting the trial.</li>
            <li><strong>Run a same-formulation comparison.</strong> Replace only the pigment at matched mass or another declared comparison basis.</li>
            <li><strong>Make controlled adjustments.</strong> Change dispersant, loading or process conditions only when the initial response provides a technical reason.</li>
            <li><strong>Use production-representative conditions.</strong> Confirm mixing, application, extrusion, drying, curing or other relevant process behavior.</li>
            <li><strong>Approve the finished product.</strong> Evaluate appearance, performance, durability and consistency against the agreed acceptance criteria.</li>
          </ol>
          <h2>What to prepare for a technical discussion</h2>
          <p>Share the current pigment and dosage, application or resin system, complete formulation context, process conditions, target result, test method, acceptance criteria and current trial stage.</p>
          <p><Link className="button button-primary" href="/contact">Discuss an evaluation plan ↗</Link></p>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
