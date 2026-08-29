import Link from 'next/link';

const pathways = [
  {
    index: '01',
    title: 'Select by application',
    copy: 'Start with the formulation, process and end-use result you need to validate.',
    href: '/applications',
  },
  {
    index: '02',
    title: 'Explore the portfolio',
    copy: 'Compare product families and build a focused shortlist for your next trial.',
    href: '/products',
  },
  {
    index: '03',
    title: 'Plan the evaluation',
    copy: 'Use practical technical guides to define controls, variables and acceptance criteria.',
    href: '/resources',
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero-shell">
        <header className="site-header">
          <Link className="brand" href="/" aria-label="TIOVAR home">
            <span className="brand-mark">T</span>
            <span>TIOVAR</span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/products">Products</Link>
            <Link href="/applications">Applications</Link>
            <Link href="/resources">Technical Resources</Link>
            <Link href="/about">About</Link>
          </nav>
          <Link className="header-action" href="/contact">Start a conversation</Link>
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Titanium dioxide for real formulation decisions</p>
            <h1>Better TiO₂ selection starts with the system.</h1>
            <p className="hero-intro">
              TIOVAR helps coatings, plastics and specialty-material teams move
              from product data to a controlled, application-specific evaluation.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/applications">
                Find your application <span aria-hidden="true">↗</span>
              </Link>
              <Link className="text-link" href="/products">
                View all products <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <aside className="signal-panel" aria-label="TIOVAR selection approach">
            <div className="signal-orbit orbit-one" />
            <div className="signal-orbit orbit-two" />
            <div className="signal-core">
              <span>FORMULATION</span>
              <strong>TiO₂</strong>
              <span>PROCESS · END USE</span>
            </div>
            <div className="signal-note signal-note-one">
              <span>01</span>
              <p>Define the system</p>
            </div>
            <div className="signal-note signal-note-two">
              <span>02</span>
              <p>Compare with control</p>
            </div>
            <div className="signal-note signal-note-three">
              <span>03</span>
              <p>Validate the result</p>
            </div>
          </aside>
        </div>

        <div className="hero-foot">
          <p>Built for technical evaluation across global markets</p>
          <div className="hero-tags" aria-label="Primary application groups">
            <span>Coatings</span><span>Plastics</span><span>Printing inks</span><span>Functional materials</span>
          </div>
        </div>
      </section>

      <section className="decision-section">
        <div className="section-heading">
          <p className="section-kicker">A clearer way to choose</p>
          <h2>Start with the decision you need to make.</h2>
          <p>Navigate by application, product or technical question. Every path leads toward a defined trial—not an automatic recommendation.</p>
        </div>
        <div className="pathway-grid">
          {pathways.map((pathway) => (
            <Link className="pathway-card" href={pathway.href} key={pathway.index}>
              <span className="pathway-index">{pathway.index}</span>
              <div>
                <h3>{pathway.title}</h3>
                <p>{pathway.copy}</p>
              </div>
              <span className="pathway-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="spotlight-section">
        <div className="spotlight-meta">
          <p className="section-kicker light">Product spotlight</p>
          <span>Premium water-based coatings</span>
        </div>
        <div className="spotlight-grid">
          <div>
            <p className="product-code">TP-C120</p>
            <h2>A focused starting point for high-end waterborne emulsion paint.</h2>
          </div>
          <div className="spotlight-copy">
            <p>
              A chloride-process rutile titanium dioxide developed for interior and
              exterior wall coatings where viscosity, hiding, tone, gloss and
              durability must be evaluated together.
            </p>
            <Link href="/products/tp-c120">Explore TP-C120 <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
