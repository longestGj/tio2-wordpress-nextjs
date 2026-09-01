import type {ReactNode} from 'react'
import Link from 'next/link'

import type {MalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import type {MalaysiaRfqPageDto} from '@/lib/wordpress/rfq-page-v01-types'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '@/components/sites/tio2-my/malaysia-global-chrome'

import {MalaysiaRfqForm} from './malaysia-rfq-form'
import styles from './malaysia-rfq-page.module.css'

interface MalaysiaRfqPageProps {
  readonly page: MalaysiaRfqPageDto
  readonly prefill: MalaysiaRfqPrefill
  readonly receiverAccessKey: string | null
  readonly privacyPolicyHref: string | null
  readonly structuredData: ReactNode
}

export function MalaysiaRfqPage({page, prefill, receiverAccessKey, privacyPolicyHref, structuredData}: MalaysiaRfqPageProps) {
  return (
    <div className={styles.site} data-site-scope="tio2-my" data-page-id="CONV-RFQ">
      <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="CONV-RFQ" sourcePageId="CONV-RFQ" />
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true"> / </span><span aria-current="page">Request a Quote</span>
        </nav>
        <section className={styles.hero} aria-labelledby="rfq-h1" data-module="hero">
          <p className={styles.eyebrow}>{page.hero.eyebrow}</p>
          <h1 id="rfq-h1">{page.hero.h1}</h1>
          <p>{page.hero.body}</p>
        </section>
        <section className={styles.formSurface} aria-labelledby="rfq-form-heading" data-module="rfq-form">
          <div className={styles.formHeading}>
            <h2 id="rfq-form-heading">{page.form.heading}</h2>
            <p>{page.form.intro}</p>
          </div>
          <MalaysiaRfqForm prefill={prefill} receiverAccessKey={receiverAccessKey} privacyPolicyHref={privacyPolicyHref} />
        </section>
        <aside className={styles.otherRequests} aria-labelledby="rfq-other-heading" data-module="other-request-types">
          <h2 id="rfq-other-heading">{page.otherRequests.heading}</h2>
          <p>{page.otherRequests.intro}</p>
          <div>
            <a href={page.routes.sample.href}>{page.routes.sample.label} <span aria-hidden="true">→</span></a>
            <a href={page.routes.documents.href}>{page.routes.documents.label} <span aria-hidden="true">→</span></a>
          </div>
        </aside>
      </main>
      <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="CONV-RFQ" />
      {structuredData}
    </div>
  )
}
