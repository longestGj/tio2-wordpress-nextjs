import {InnerPage} from '../../components/site-chrome';

export default function AboutPage() {
  return (
    <InnerPage
      eyebrow="About TIOVAR"
      title="A titanium dioxide brand built around better evaluation."
      intro="TIOVAR brings product information, application context and technical guidance into one connected decision path for global industrial customers."
    >
      <section className="split-section">
        <p className="split-label">Our approach</p>
        <div className="split-content prose">
          <h2>Clarity before claims.</h2>
          <p>A useful product conversation begins with what the customer is making, how it is processed and which finished result matters. TIOVAR content is structured to support that conversation without turning typical powder values into automatic performance promises.</p>
          <p>The portfolio covers coatings, plastics, printing inks, decorative paper, solar film and selected functional-material applications. Every candidate still requires evaluation in the intended formulation, process and end use.</p>
        </div>
      </section>
      <section className="split-section alt">
        <p className="split-label">How we support decisions</p>
        <div className="split-content">
          <h2>Product, application and technical context work together.</h2>
          <div className="priority-grid">
            <div className="priority-card"><span>01</span><h3>Product evidence</h3><p>Understand grade direction, typical properties and documented limits.</p></div>
            <div className="priority-card"><span>02</span><h3>Application context</h3><p>Connect the candidate to formulation, process and end-use priorities.</p></div>
            <div className="priority-card"><span>03</span><h3>Evaluation planning</h3><p>Define a matched control, variables, measurements and acceptance criteria.</p></div>
            <div className="priority-card"><span>04</span><h3>Technical discussion</h3><p>Bring the right customer inputs into a focused next-step conversation.</p></div>
          </div>
        </div>
      </section>
    </InnerPage>
  );
}
