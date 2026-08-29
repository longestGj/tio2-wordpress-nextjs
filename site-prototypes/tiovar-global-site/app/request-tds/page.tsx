import {EnquiryForm} from '../../components/enquiry-form';
import {InnerPage} from '../../components/site-chrome';

export default function RequestTdsPage() {
  return (
    <InnerPage
      eyebrow="Technical Data Sheet request"
      title="Request the document with the application context attached."
      intro="TIOVAR Technical Data Sheets are provided through an enquiry. They are not offered as public downloads."
    >
      <section className="contact-grid">
        <div className="contact-copy">
          <p className="section-kicker">Request a TDS</p>
          <h2>Help us send the relevant technical information.</h2>
          <p>Identify the TIOVAR grade and share the intended application, formulation or resin, process and destination market. This keeps document delivery connected to the right product discussion.</p>
        </div>
        <EnquiryForm defaultIntent="Request a TDS" />
      </section>
    </InnerPage>
  );
}
