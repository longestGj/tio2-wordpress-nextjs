export function EnquiryForm({defaultIntent = 'Discuss an application'}: {defaultIntent?: string}) {
  return (
    <form className="prototype-form" action="#">
      <label>What do you need?
        <select defaultValue={defaultIntent} name="intent">
          <option>Discuss an application</option>
          <option>Request a TDS</option>
          <option>Request a sample</option>
          <option>Commercial enquiry</option>
        </select>
      </label>
      <label>Product or grade
        <input name="grade" placeholder="e.g. TP-C120" />
      </label>
      <label>Your name
        <input name="name" placeholder="Full name" />
      </label>
      <label>Business email
        <input type="email" name="email" placeholder="name@company.com" />
      </label>
      <label>Company
        <input name="company" placeholder="Company name" />
      </label>
      <label>Destination market
        <input name="market" placeholder="Country or region" />
      </label>
      <label className="full">Application and current objective
        <textarea name="message" placeholder="Tell us about the formulation or resin, current control, process and result you need to evaluate." />
      </label>
      <button className="button button-primary" type="submit">Send enquiry <span>↗</span></button>
      <p className="prototype-note">Prototype form only. The production workflow will define consent, delivery and response handling before launch.</p>
    </form>
  );
}
