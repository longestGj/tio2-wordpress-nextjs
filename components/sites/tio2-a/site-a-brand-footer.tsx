import Image from 'next/image'

import styles from './homepage/brand-homepage.module.css'

interface SiteABrandFooterProps {
  readonly description: string
  readonly anchorPrefix?: '' | '/'
}

export function SiteABrandFooter({
  description,
  anchorPrefix = '',
}: SiteABrandFooterProps) {
  const anchor = (id: 'documents' | 'inquiry') => `${anchorPrefix}#${id}`

  return (
    <footer className={styles.footer}>
      <div className={`${styles.wrap} ${styles.footerGrid}`}>
        <div>
          <Image src="/site-a/tiovar-logo.png" alt="TIOVAR" width={492} height={111} className={styles.footerLogo} />
          <p>{description}</p>
        </div>
        <div><h3>Explore</h3><span>Products</span><span>Applications</span><span>Technical Resources</span></div>
        <div><h3>Work with us</h3><a href={anchor('inquiry')}>Discuss an application</a><a href={anchor('documents')}>Request documents</a><a href={anchor('inquiry')}>Request a sample</a></div>
        <div><h3>TIOVAR</h3><span>About TIOVAR</span><a href={anchor('inquiry')}>Contact</a><span>Privacy</span></div>
      </div>
      <div className={`${styles.wrap} ${styles.footerBase}`}><span>© TIOVAR</span><span>Titanium dioxide for industrial applications</span></div>
    </footer>
  )
}
