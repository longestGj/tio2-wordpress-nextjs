import {EnquiryForm} from '../../components/enquiry-form';
import {InnerPage} from '../../components/site-chrome';

export default function ContactPage() {
  return (
    <InnerPage
      eyebrow="Technical and commercial enquiry"
      title="Bring the application into the conversation."
      intro="Share enough context for a focused next step: the grade, material system, process, target result and destination market."
    >
      <section className="contact-grid">
        <div className="contact-copy">
          <p className="section-kicker">Start a conversation</p>
          <h2>What helps us understand the request?</h2>
          <p>Include the application, formulation or resin system, current control, pigment loading, process conditions, performance target and planned test method where available.</p>
        </div>
        <EnquiryForm />
      </section>
    </InnerPage>
  );
}
