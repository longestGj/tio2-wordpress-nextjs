'use client'

import {useLayoutEffect, useState} from 'react'
import Link from 'next/link'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '@/components/sites/tio2-my/malaysia-global-chrome'
import {resolveMalaysiaThankYouRequest, type MalaysiaThankYouState} from '@/lib/thank-you/malaysia-thank-you-session'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import styles from './malaysia-thank-you-page.module.css'

const panels = {
  quote: {
    heading: 'Thank you. We’ve received your quotation request.',
    body: 'Our team will review the details and contact you using the information provided.',
    actions: [['Explore Products', '/products/'], ['Go to Homepage', '/']],
  },
  documents: {
    heading: 'Thank you. We’ve received your document request.',
    body: 'Our team will review the requested documents and contact you using the information provided.',
    actions: [['Return to Documents', '/documents/'], ['Explore Products', '/products/']],
  },
  sample: {
    heading: 'Thank you. We’ve received your sample request.',
    body: 'Our team will review your application and sample requirements and contact you using the information provided.',
    actions: [['Explore Products', '/products/'], ['View Applications', '/applications/']],
  },
  direct: {
    heading: 'How can we help?',
    body: 'Choose the request you’d like to make, and our team will guide you through the next step.',
    actions: [['Request a Quote', '/request-a-quote/'], ['Request Documents', '/request-documents/'], ['Request a Sample', '/request-sample/']],
  },
} as const

export function MalaysiaThankYouPage({initialState}: {readonly initialState?: MalaysiaThankYouState}) {
  const [state, setState] = useState<MalaysiaThankYouState>(initialState ?? 'direct')
  useLayoutEffect(() => {
    // The neutral SSR shell must resolve the same-session receipt before the browser paints a success state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialState === undefined) setState(resolveMalaysiaThankYouRequest(window.location.search))
  }, [initialState])
  const panel = panels[state]
  const isSuccess = state !== 'direct'
  return (
    <div className={styles.page} data-site-scope="tio2-my" data-page-id="CONV-THANK">
      <MalaysiaGlobalHeader chrome={globalChrome} currentPageId="NONE" sourcePageId="CONV-THANK" />
      <main className={styles.main} id="main">
        <section className={`${styles.panel} ${isSuccess ? styles.success : styles.direct}`} data-thank-you-panel={state} aria-labelledby="thank-you-heading">
          {isSuccess && <div className={styles.receiptCue}>
            <span className={styles.receiptIcon} data-receipt-icon aria-hidden="true">✓</span>
            <span>REQUEST RECEIVED</span>
          </div>}
          <h1 id="thank-you-heading">{panel.heading}</h1>
          <p>{panel.body}</p>
          <div className={`${styles.actions} ${panel.actions.length === 3 ? styles.threeActions : ''}`}>
            {panel.actions.map(([label, href], index) => <Link key={label} className={`${styles.action} ${index === 0 ? styles.primary : ''}`} href={href}>{label}</Link>)}
          </div>
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={globalChrome} sourcePageId="CONV-THANK" />
    </div>
  )
}
