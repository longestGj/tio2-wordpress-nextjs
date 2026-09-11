import Image from 'next/image'

import type {MalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-types'

import {
  MalaysiaGlobalFooter,
  MalaysiaGlobalHeader,
} from '../malaysia-global-chrome'
import {MalaysiaPrivateRfqLink} from '../request-a-quote/malaysia-private-rfq-link'
import {RootPageHero} from '../root-page-hero/root-page-hero'
import styles from './malaysia-homepage.module.css'
import {ResponsiveProductGroup, ResponsiveProductGroups} from './responsive-product-groups'

function Eyebrow({children}: {readonly children: React.ReactNode}) {
  return <p className={styles.eyebrow}>{children}</p>
}

function ApprovedLink({children, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  readonly href: string
}) {
  return <a {...props}>{children}</a>
}

function UnresolvedAction({children}: {readonly children: React.ReactNode}) {
  return <span className={styles.unresolvedAction} role="link" aria-disabled="true">{children}</span>
}

export function MalaysiaHomepage({homepage, structuredData}: {
  readonly homepage: MalaysiaHomepageDto
  readonly structuredData?: React.ReactNode
}) {
  return (
    <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my">
      {structuredData}
      <MalaysiaGlobalHeader
        chrome={homepage.globalChrome}
        currentPageId="HOME-001"
        sourcePageId="HOME-001"
      />
      <main className={styles.homepageMain}>
        <RootPageHero
          pageId="HOME-001"
          variant="flagship-light"
          surface="open"
          breadcrumbModuleName="breadcrumb"
          headingId="my-hero-heading"
          moduleName="hero"
          eyebrow={homepage.hero.eyebrow}
          heading={homepage.hero.heading}
          intro={<p>{homepage.hero.body}</p>}
          actions={
            <>
              <MalaysiaPrivateRfqLink className={styles.primaryButton} href={homepage.hero.primaryCta.href}>
                {homepage.hero.primaryCta.label}
              </MalaysiaPrivateRfqLink>
              <ApprovedLink className={styles.secondaryButton} href={homepage.hero.secondaryCta.href}>
                {homepage.hero.secondaryCta.label}
              </ApprovedLink>
            </>
          }
          media={<div className={styles.heroVisual} aria-hidden="true">
            <Image
              src={homepage.hero.media.src}
              alt=""
              width={homepage.hero.media.width}
              height={homepage.hero.media.height}
              className={styles.heroImage}
              sizes="(min-width: 1101px) 430px, (min-width: 561px) 40vw, calc(100vw - 84px)"
              fetchPriority="high"
            />
          </div>}
        />

        <section className={styles.startHere} data-module="start-here" aria-label="Start here">
          <div className={styles.startIntro}><Eyebrow>{homepage.startHere.label}</Eyebrow><p>{homepage.startHere.intro}</p></div>
          {homepage.startHere.items.map((item, index) => (
            <ApprovedLink key={item.targetPageId} href={item.href} className={styles.startItem}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.title}</strong><small>{item.description}</small><b aria-hidden>→</b>
            </ApprovedLink>
          ))}
        </section>

        <section className={`${styles.section} ${styles.tint}`} data-module="markets" aria-labelledby="my-markets-heading">
          <div className={styles.sectionHeading}>
            <div><Eyebrow>{homepage.markets.eyebrow}</Eyebrow><h2 id="my-markets-heading">{homepage.markets.heading}</h2><p>{homepage.markets.intro}</p></div>
            <ApprovedLink href={homepage.markets.sectionCta.href}>{homepage.markets.sectionCta.label}</ApprovedLink>
          </div>
          <div className={styles.marketGrid}>
            {homepage.markets.items.map((item) => (
              <article className={`${styles.card} ${styles.marketCard}`} key={item.targetPageId}>
                <span className={styles.code}>{item.code}</span><h3>{item.title}</h3><p>{item.description}</p>
                <ApprovedLink href={item.href}>{item.ctaLabel}</ApprovedLink>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} data-module="products" aria-labelledby="my-products-heading">
          <div className={styles.productHeading}>
            <div><Eyebrow>{homepage.products.eyebrow}</Eyebrow><h2 id="my-products-heading">{homepage.products.heading}</h2><p>{homepage.products.intro}</p></div>
            <div className={styles.gradeCount}><strong>14</strong><span>{homepage.products.countLabel.replace(/^14 /u, '')}</span></div>
          </div>
          <ResponsiveProductGroups>
            <div className={styles.productGrid}>
              {homepage.products.groups.map((group, index) => (
                <ResponsiveProductGroup count={group.gradeIds.length} key={group.title} title={group.title}>
                  <article>
                    <span className={styles.groupCount}>{String(index + 1).padStart(2, '0')} / {String(group.gradeIds.length).padStart(2, '0')}</span>
                    <h3>{group.title}</h3><div className={styles.gradeIds}>{group.gradeIds.map((id) => <span data-product-grade-id key={id}>{id}</span>)}</div>
                    <p>{group.description}</p>
                  </article>
                </ResponsiveProductGroup>
              ))}
            </div>
          </ResponsiveProductGroups>
          <div className={styles.productActions}>
            <div>{homepage.products.processLinks.map((link) => <ApprovedLink key={link.targetPageId} href={link.href}>{link.label}</ApprovedLink>)}</div>
            <ApprovedLink className={styles.primaryButton} href={homepage.products.primaryCta.href}>{homepage.products.primaryCta.label}</ApprovedLink>
          </div>
        </section>

        <section className={`${styles.section} ${styles.tint}`} data-module="applications" aria-labelledby="my-applications-heading">
          <Eyebrow>{homepage.applications.eyebrow}</Eyebrow><h2 id="my-applications-heading">{homepage.applications.heading}</h2><p>{homepage.applications.intro}</p>
          <div className={styles.applicationGrid}>
            {homepage.applications.items.map((item) => (
              <article className={`${styles.card} ${styles.applicationCard}`} key={item.targetPageId}>
                <span className={styles.code}>{item.symbol}</span><h3>{item.title}</h3><p>{item.description}</p>
                {item.href ? <ApprovedLink href={item.href}>{item.ctaLabel}</ApprovedLink> : <UnresolvedAction>{item.ctaLabel}</UnresolvedAction>}
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.company}`} data-module="company" aria-labelledby="my-company-heading">
          <div><Eyebrow>{homepage.company.eyebrow}</Eyebrow><h2 id="my-company-heading">{homepage.company.heading}</h2><p>{homepage.company.body}</p><ApprovedLink href={homepage.company.cta.href}>{homepage.company.cta.label}</ApprovedLink></div>
          <aside><h3>{homepage.company.entityName}</h3>{homepage.company.summaries.map((item) => <div key={item.title}><strong>{item.title}</strong><p>{item.description}</p></div>)}</aside>
        </section>

        <section className={`${styles.section} ${styles.documents}`} data-module="documents" aria-labelledby="my-documents-heading">
          <Eyebrow>{homepage.documents.eyebrow}</Eyebrow><h2 id="my-documents-heading">{homepage.documents.heading}</h2><p>{homepage.documents.intro}</p>
          <div className={styles.documentGrid}>{homepage.documents.items.map((item) => <article className={`${styles.card} ${styles.documentCard}`} key={item.targetPageId}><h3>{item.title}</h3><p>{item.description}</p><ApprovedLink href={item.href}>{item.ctaLabel}</ApprovedLink></article>)}</div>
        </section>

        <section className={styles.section} data-module="resources" aria-labelledby="my-resources-heading">
          <Eyebrow>{homepage.resources.eyebrow}</Eyebrow><h2 id="my-resources-heading">{homepage.resources.heading}</h2><p>{homepage.resources.intro}</p>
          <div className={styles.resourceGrid}>
            {homepage.resources.topics.map((item) => <article className={`${styles.card} ${styles.resourceCard}`} key={item.targetPageId}><h3>{item.title}</h3><p>{item.description}</p>{item.href ? <ApprovedLink href={item.href}>{item.ctaLabel}</ApprovedLink> : <UnresolvedAction>{item.ctaLabel}</UnresolvedAction>}</article>)}
            {homepage.resources.answers.map((item) => <article className={`${styles.card} ${styles.answerCard}`} key={item.question}><h3>{item.question}</h3><p>{item.answer}</p>{item.cta.targetPageId === 'CONV-RFQ' ? <MalaysiaPrivateRfqLink href={item.cta.href}>{item.cta.label}</MalaysiaPrivateRfqLink> : <ApprovedLink href={item.cta.href}>{item.cta.label}</ApprovedLink>}</article>)}
          </div>
        </section>

        <section className={styles.pageRfq} data-module="page-rfq" data-mobile-render="false" aria-labelledby="my-rfq-heading">
          <div><Eyebrow>{homepage.pageRfq.eyebrow}</Eyebrow><h2 id="my-rfq-heading">{homepage.pageRfq.heading}</h2><p>{homepage.pageRfq.body}</p></div>
          <div className={styles.rfqFields}>{homepage.pageRfq.fieldSummaries.map((field) => <span key={field}>{field}</span>)}</div>
          <MalaysiaPrivateRfqLink className={styles.primaryButton} href={homepage.pageRfq.cta.href}>{homepage.pageRfq.cta.label}</MalaysiaPrivateRfqLink>
        </section>
      </main>

      <MalaysiaGlobalFooter chrome={homepage.globalChrome} sourcePageId="HOME-001" />
    </div>
  )
}
