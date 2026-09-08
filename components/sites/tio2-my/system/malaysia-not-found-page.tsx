import Link from 'next/link'

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
            <Link className={`${styles.action} ${styles.primary}`} href="/products/">Explore Products</Link>
            <Link className={styles.action} href="/">Go to Homepage</Link>
          </div>
          <div className={styles.supportingActions}>
            <Link href="/request-documents/">Request Documents</Link>
            <Link href="/contact/">Contact Our Team</Link>
            <Link href="/request-a-quote/">Request a Quote</Link>
          </div>
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={globalChrome} sourcePageId="SYS-404" />
    </div>
  )
}
