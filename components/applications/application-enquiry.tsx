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
  return (
    <>
      <section id="documents" className={`${styles.section} ${styles.wrap} ${styles.documentRequest}`} aria-labelledby="application-documents-heading">
        <div>
          <p className={styles.eyebrow}>Documents by request</p>
          <h2 id="application-documents-heading">Request the documents needed for your evaluation</h2>
          <p>Technical documents are matched to the relevant evaluation context and supplied by request.</p>
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
              Prepare a useful application discussion
            </h2>
            <p>
              Share enough context to compare a realistic starting point without treating powder data as finished-product proof.
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
