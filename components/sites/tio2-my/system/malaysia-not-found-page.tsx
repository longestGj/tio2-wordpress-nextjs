/* eslint-disable @next/next/no-html-link-for-pages -- approved recovery URLs retain their exact trailing-slash targets */

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '@/components/sites/tio2-my/malaysia-global-chrome'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import styles from './malaysia-not-found-page.module.css'

export function MalaysiaNotFoundPage() {
  return (
    <div className={styles.page} data-site-scope="tio2-my" data-page-id="SYS-404">
      <MalaysiaGlobalHeader chrome={globalChrome} currentPageId="NONE" sourcePageId="SYS-404" />
      <main className={styles.main} id="main">
        <section className={styles.panel} data-system-404-panel aria-labelledby="system-404-heading">
          <p className={styles.eyebrow}>404 · PAGE NOT FOUND</p>
          <h1 id="system-404-heading">Let’s help you find what you need.</h1>
          <p className={styles.body}>The page you’re looking for may have moved or is no longer available. You can continue by exploring our titanium dioxide products, requesting technical documents, or contacting our team.</p>
          <div className={styles.primaryActions}>
            <a className={`${styles.action} ${styles.primary}`} href="/products/">Explore Products</a>
            <a className={styles.action} href="/">Go to Homepage</a>
          </div>
          <div className={styles.supportingActions}>
            <a href="/request-documents/">Request Documents</a>
            <a href="/contact/">Contact Our Team</a>
            <a href="/request-a-quote/">Request a Quote</a>
          </div>
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={globalChrome} sourcePageId="SYS-404" />
    </div>
  )
}
