import type {ReactNode} from 'react'

import type {MalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-types'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-contact-page.module.css'

interface Props {
  readonly page: MalaysiaContactPageDto
  readonly form: ReactNode
  readonly structuredData?: ReactNode
}

function Arrow() { return <span aria-hidden="true">→</span> }

export function MalaysiaContactPage({page, form, structuredData}: Props) {
  const details = [
    page.contactDetails.generalInquiries,
    page.contactDetails.operatingCompany,
    page.contactDetails.manufacturingSite,
  ].filter((fact): fact is NonNullable<typeof fact> => fact !== null)
  const completeDetails = details.length === 3

  return (
    <div className={styles.site} data-site-scope="tio2-my" data-page-id="CONTACT-001">
      {structuredData}
      <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="ABOUT-001" sourcePageId="CONTACT-001" />
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <ol>{page.breadcrumb.map((item, index) => <li key={item.href}>{index === 0 ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</li>)}</ol>
        </nav>

        <section className={styles.hero} data-module="hero">
          <div>
            <p className={styles.eyebrow}>{page.hero.eyebrow}</p>
            <h1>{page.hero.h1}</h1>
            <p className={styles.heroLead}>{page.hero.lead}</p>
            <a className={styles.primaryAction} href={page.hero.action.href}>{page.hero.action.label}<Arrow /></a>
          </div>
          <div className={styles.heroGraphic} aria-hidden="true"><span /><i /><b /></div>
        </section>

        <section className={styles.details} data-module="contact-details">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>CONTACT DETAILS</p>
            <h2>{page.contactDetails.heading}</h2>
            <p>{page.contactDetails.introBase}{completeDetails ? ` ${page.contactDetails.introDetails}` : ''}</p>
          </div>
          <dl className={styles.detailGrid}>{details.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        </section>

        <section className={styles.routing} data-module="dedicated-requests">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>SPECIALIST REQUESTS</p><h2>{page.specialistRouting.heading}</h2><p>{page.specialistRouting.intro}</p></div>
          <div className={styles.routeGrid}>{page.specialistRouting.items.map((item, index) => <article key={item.href}><span>{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.body}</p><a href={item.href}>{item.label}<Arrow /></a></article>)}</div>
        </section>

        <section id="general-inquiry" tabIndex={-1} className={styles.inquiry} data-module="general-inquiry" aria-labelledby="general-inquiry-heading">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>GENERAL INQUIRY</p><h2 id="general-inquiry-heading">{page.form.heading}</h2><p>{page.form.intro}</p></div>
          {form}
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="CONTACT-001" />
    </div>
  )
}
