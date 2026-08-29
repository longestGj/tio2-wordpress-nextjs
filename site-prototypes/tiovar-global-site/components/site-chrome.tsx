import Link from 'next/link';
import type {ReactNode} from 'react';

export function SiteHeader({light = false}: {light?: boolean}) {
  return (
    <header className={light ? 'inner-header light' : 'inner-header'}>
      <Link className="brand" href="/" aria-label="TIOVAR home">
        <span className="brand-mark">T</span><span>TIOVAR</span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/products">Products</Link>
        <Link href="/applications">Applications</Link>
        <Link href="/resources">Technical Resources</Link>
        <Link href="/about">About</Link>
      </nav>
      <Link className="header-action" href="/contact">Start a conversation</Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link className="brand" href="/"><span className="brand-mark">T</span><span>TIOVAR</span></Link>
        <p>Titanium dioxide selection built around the formulation, process and finished-product decision.</p>
      </div>
      <div>
        <p className="footer-label">Explore</p>
        <Link href="/products">Products</Link>
        <Link href="/applications">Applications</Link>
        <Link href="/resources">Technical resources</Link>
      </div>
      <div>
        <p className="footer-label">Connect</p>
        <Link href="/contact">Discuss your application</Link>
        <Link href="/request-tds">Request a TDS</Link>
        <Link href="/about">About TIOVAR</Link>
      </div>
      <div className="footer-note">
        <span>Global market</span>
        <span>English</span>
        <p>Technical Data Sheets are available on request.</p>
      </div>
    </footer>
  );
}

export function InnerPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="inner-hero">
        <SiteHeader />
        <div className="inner-hero-copy">
          <p className="eyebrow"><span />{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </div>
      {children}
      <SiteFooter />
    </>
  );
}
