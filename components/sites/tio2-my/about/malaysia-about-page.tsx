import type {ReactNode} from 'react'
import Link from 'next/link'

import type {MalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-types'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-about-page.module.css'

interface Props {
  readonly aboutPage: MalaysiaAboutPageDto
  readonly structuredData?: ReactNode
}

function Arrow() { return <span aria-hidden="true">→</span> }

const heroLinkMarks = [
  ['Malaysia-based rutile titanium dioxide manufacturer and supplier', '/products/'],
  ['paints and coatings', '/applications/'],
  ['printing inks', '/applications/'],
  ['masterbatch', '/applications/'],
  ['plastics', '/applications/'],
  ['paper', '/applications/'],
  ['titanium dioxide supplier in Malaysia', '/'],
] as const

function linkedHeroText(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let remaining = text
  let offset = 0
  while (remaining) {
    const match = heroLinkMarks
      .map(([label, href]) => ({label, href, index: remaining.indexOf(label)}))
      .filter(({index}) => index >= 0)
      .sort((a, b) => a.index - b.index || b.label.length - a.label.length)[0]
    if (!match) { nodes.push(remaining); break }
    if (match.index > 0) nodes.push(remaining.slice(0, match.index))
    nodes.push(<Link key={`${offset}-${match.label}`} href={match.href}>{match.label}</Link>)
    const consumed = match.index + match.label.length
    offset += consumed
    remaining = remaining.slice(consumed)
  }
  return nodes
}

function HeroCopy({page}: {readonly page: MalaysiaAboutPageDto}) {
  return (
    <div className={styles.heroCopy}>
      {page.hero.paragraphs.map((paragraph) => (
        <p key={paragraph.id} data-fact-key={paragraph.id}>{linkedHeroText(paragraph.text)}</p>
      ))}
    </div>
  )
}

function HeroVisual() {
  return (
    <div className={styles.heroVisual} aria-hidden="true">
      <div className={styles.heroPowder}><span /></div>
      <div className={styles.heroBag}>RUTILE<br /><strong>TiO₂</strong><small>MALAYSIA</small></div>
      <div className={styles.portScene}><span /><span /><span /><i /><b /></div>
      <svg className={styles.routeMap} viewBox="0 0 540 240" focusable="false">
        <path className={styles.mapLand} d="M16 78l52-33 69 13 28 38-33 24-64-7-30 24-31-22zm180 23l39-55 72-20 60 31-17 51-44 19-26 54-50-21-9-37zm225-27l42-24 61 29-8 58-42 31-52-23-24-42z" />
        <path d="M350 143C268 130 224 75 132 65M350 143C292 111 289 60 250 45M350 143C337 124 351 103 371 87M350 143C410 167 442 164 478 151" />
        <circle cx="350" cy="143" r="8" />
        <circle cx="132" cy="65" r="5" /><circle cx="250" cy="45" r="5" /><circle cx="371" cy="87" r="5" /><circle cx="478" cy="151" r="5" />
        <text x="79" y="53">EUROPEAN UNION</text><text x="214" y="30">UNITED KINGDOM</text>
        <text x="350" y="74">INDIA</text><text x="455" y="139">BRAZIL</text><text x="360" y="166">MALAYSIA</text>
      </svg>
      <p>Taiping <span>→</span> Port Klang <span>→</span> Global markets</p>
    </div>
  )
}

function MarketMap() {
  return (
    <svg className={styles.marketMap} viewBox="0 0 760 300" aria-hidden="true" focusable="false">
      <path d="M65 115l52-41 63 16 23 43 56 23 12 53-75 17-41-23-59 10-38-42zM318 99l45-42 87 17 36 47-28 49-71 8-33-33-44-4zM517 120l52-54 92 22 38 66-33 53-80 22-43-44-51-19z" />
      <path className={styles.marketRoute} d="M240 181 C350 47 478 254 660 124" />
      <circle cx="240" cy="181" r="8" /><circle cx="377" cy="121" r="8" /><circle cx="526" cy="177" r="8" /><circle cx="660" cy="124" r="8" />
    </svg>
  )
}

function ApplicationArt({kind, alt}: {readonly kind: string; readonly alt: string}) {
  return <div className={styles.applicationArt} data-art={kind} role="img" aria-label={alt}><span /><i /><b /></div>
}

export function MalaysiaAboutPage({aboutPage: page, structuredData}: Props) {
  return (
    <div className={styles.site} data-site-scope="tio2-my" data-page-id="ABOUT-001">
      {structuredData}
      <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="ABOUT-001" sourcePageId="ABOUT-001" />
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <ol>{page.breadcrumb.map((item, index) => <li key={item.targetPageId}>{index === 0 ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</li>)}</ol>
        </nav>

        <section className={`${styles.hero} ${page.hero.visualVisible ? '' : styles.heroNeutral}`} data-module="hero">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>{page.hero.eyebrow}</p>
            <h1>{page.hero.h1}</h1>
            <HeroCopy page={page} />
            <div className={styles.actions}>
              <a className={styles.primary} href={page.hero.primaryAction.href} data-site-scope="tio2-my" data-source-page="ABOUT-001">{page.hero.primaryAction.label}<Arrow /></a>
              <a className={styles.secondary} href={page.hero.secondaryAction.href}>{page.hero.secondaryAction.label}</a>
            </div>
          </div>
          {page.hero.visualVisible ? <HeroVisual /> : null}
        </section>

        <section className={styles.identity} data-module="who-we-are">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>{page.whoWeAre.eyebrow}</p><h2>{page.whoWeAre.h2}</h2></div>
          <dl className={styles.factGrid}>{page.whoWeAre.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{'href' in fact ? <a href={fact.href}>{fact.value}</a> : fact.value}</dd></div>)}</dl>
        </section>

        {page.whyMalaysia ? <section className={styles.why} data-module="why-malaysia">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>{page.whyMalaysia.eyebrow}</p><h2>{page.whyMalaysia.h2}</h2></div>
          <div className={styles.quadGrid}>{page.whyMalaysia.items.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </section> : null}

        {page.whatWeDo ? <section className={styles.services} data-module="what-we-do">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>{page.whatWeDo.eyebrow}</p><h2>{page.whatWeDo.h2}</h2></div>
          <div className={styles.serviceGrid}>{page.whatWeDo.items.map((item, index) => <article key={item.title}><b>{String(index + 1).padStart(2, '0')}</b><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div>
        </section> : null}

        {page.markets ? <section className={styles.markets} data-module="markets">
          <div className={styles.marketIntro}><p className={styles.eyebrow}>{page.markets.eyebrow}</p><h2>{page.markets.h2}</h2><MarketMap /></div>
          <div className={styles.marketCards}>{page.markets.items.map((item, index) => <a key={item.targetPageId} data-flag={['eu','uk','in','br'][index]} href={item.href}><span>{['EU','UK','IN','BR'][index]}</span><h3>{item.title}</h3><p>{item.body}</p><Arrow /></a>)}<a className={styles.allLink} href={page.markets.action.href}>{page.markets.action.label}<Arrow /></a></div>
        </section> : null}

        {page.applications ? <section className={styles.applications} data-module="applications">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>{page.applications.eyebrow}</p><h2>{page.applications.h2}</h2></div>
          <div className={styles.applicationGrid}>{page.applications.items.map((item) => <a key={item.title} href={item.href}><ApplicationArt kind={item.mediaKey.split('.').at(-1) ?? ''} alt={item.alt} /><div><h3>{item.title}</h3><p>{item.body}</p><Arrow /></div></a>)}</div>
          <a className={styles.sectionAction} href={page.applications.action.href}>{page.applications.action.label}<Arrow /></a>
        </section> : null}

        {page.howWeWork ? <section className={styles.process} data-module="how-we-work">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>{page.howWeWork.eyebrow}</p><h2>{page.howWeWork.h2}</h2></div>
          <ol>{page.howWeWork.items.map((item, index) => <li key={item.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{item.title}</h3><p>{item.body}</p></div></li>)}</ol>
        </section> : null}

        {page.documentation ? <section className={styles.documents} data-module="documentation">
          <div><p className={styles.eyebrow}>{page.documentation.eyebrow}</p><h2>{page.documentation.h2}</h2>{page.documentation.intro.map((text) => <p key={text}>{text}</p>)}</div>
          <div className={styles.documentList}>{page.documentation.items.map((item) => <a key={item.title} href={item.href}><strong>{item.title}</strong><span>{item.label}</span><small>{item.status}</small><Arrow /></a>)}</div>
        </section> : null}

        {page.companyFacts.items.length ? <section className={styles.companyFacts} data-module="company-facts">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>{page.companyFacts.eyebrow}</p><h2>{page.companyFacts.h2}</h2></div>
          <dl>{page.companyFacts.items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
        </section> : null}

        <section className={styles.finalCta} data-module="final-cta">
          {page.finalCta.visualVisible ? <div className={styles.industrialStructure} aria-hidden="true"><span /><span /><i /><b /></div> : null}
          <div><p className={styles.eyebrow}>NEXT STEP</p><h2>{page.finalCta.h2}</h2><p>{page.finalCta.body}</p></div>
          <div className={styles.actions}>
            <a className={styles.lightPrimary} href={page.finalCta.primaryAction.href} data-site-scope="tio2-my" data-source-page="ABOUT-001">{page.finalCta.primaryAction.label}<Arrow /></a>
            <a className={styles.lightSecondary} href={page.finalCta.secondaryAction.href}>{page.finalCta.secondaryAction.label}</a>
          </div>
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="ABOUT-001" />
    </div>
  )
}
