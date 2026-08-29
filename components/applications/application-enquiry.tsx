import type {ApplicationPageDto} from '@/lib/applications/types'

import {EditorialCta} from '@/components/editorial/editorial-cta'
import styles from './application-page.module.css'

export function ApplicationEnquiry({
  application,
}: {
  readonly application: ApplicationPageDto
}) {
  const documentCta = application.ctas.find(({kind}) => kind === 'request-tds')
  const discussCta = application.ctas.find(({kind}) => kind === 'discuss-application')
  const plastics = application.identity.id === 'plastics'
  const masterbatch = application.identity.id === 'masterbatch'
  return (
    <>
      <section id="documents" className={`${styles.section} ${styles.wrap} ${styles.documentRequest}`} aria-labelledby="application-documents-heading">
        <div>
          <p className={styles.eyebrow}>Documents by request</p>
          <h2 id="application-documents-heading">Request the documents needed for your evaluation</h2>
          <p>
            {masterbatch
              ? 'Request the relevant TDS and supporting technical information for the grade you are evaluating.'
              : plastics
              ? 'Request the relevant TDS or supporting technical information for the grades you are evaluating. Providing the application and resin context helps us respond with the appropriate documentation.'
              : 'Technical documents are matched to the relevant evaluation context and supplied by request.'}
          </p>
        </div>
        <div className={styles.documentActions}>
          {documentCta ? <a href={documentCta.href}>{documentCta.label}</a> : null}
          {discussCta ? <a href={discussCta.href}>{discussCta.label}</a> : null}
        </div>
      </section>
      <div id="inquiry" className={styles.enquiry}>
        <section
          className={`${styles.wrap} ${styles.enquiryGrid}`}
          data-application-section="customer-inputs"
          aria-labelledby="application-customer-inputs-heading"
        >
          <div>
            <p className={styles.eyebrow}>Technical enquiry</p>
            <h2 id="application-customer-inputs-heading">
              {plastics
                ? 'Prepare a Focused Application Discussion'
                : 'Prepare a useful application discussion'}
            </h2>
            <p>
              {masterbatch
                ? 'Share the application, formulation and process context needed to identify a realistic evaluation starting point and plan the next trial.'
                : plastics
                ? 'Share the application and processing context needed to identify a realistic evaluation starting point and plan the next trial.'
                : 'Share enough context to compare a realistic starting point without treating powder data as finished-product proof.'}
            </p>
          </div>
          <div className={styles.inputPanel}>
            <h3>What to define before testing</h3>
            <ul>
              {application.decisionGuide.customerInputs.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
        <div className={styles.enquiryActions}>
          <EditorialCta
            ctas={application.ctas}
            headingId="application-cta-heading"
          />
        </div>
      </div>
    </>
  )
}
