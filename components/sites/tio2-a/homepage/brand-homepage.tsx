import Image from 'next/image'

import type {SiteABrandHomepageDto} from '@/lib/wordpress/homepage-v03-types'
import {SiteABrandFooter} from '@/components/sites/tio2-a/site-a-brand-footer'

import {BrandInquiryForm} from './brand-inquiry-form'
import styles from './brand-homepage.module.css'

interface BrandHomepageProps {
  readonly homepage: SiteABrandHomepageDto
}

function SectionIntro({eyebrow, heading, intro, id}: {
  readonly eyebrow: string
  readonly heading: string
  readonly intro?: string
  readonly id: string
}) {
  return (
    <div className={styles.sectionHead}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id}>{heading}</h2>
      {intro ? <p className={styles.sectionIntro}>{intro}</p> : null}
    </div>
  )
}

export function BrandHomepage({homepage}: BrandHomepageProps) {
  return (
    <div className={styles.homepage}>
      <section className={styles.hero} aria-labelledby="tiovar-hero-heading">
        <Image
          className={styles.heroImage}
          src={homepage.hero.image?.src ?? '/site-a/tiovar-hero-materials.jpg'}
          alt={homepage.hero.image?.alt ?? 'Titanium dioxide material evaluation in a bright technical laboratory'}
          width={homepage.hero.image?.width ?? 1600}
          height={homepage.hero.image?.height ?? 1067}
          sizes="(max-width: 760px) 100vw, 67vw"
          priority
        />
        <div className={`${styles.wrap} ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{homepage.hero.eyebrow}</p>
            <h1 id="tiovar-hero-heading">{homepage.hero.heading}</h1>
            <p className={styles.heroSummary}>{homepage.hero.summary}</p>
            <div className={styles.actions}>
              <a className={styles.primaryButton} href="#inquiry">{homepage.hero.primaryLabel}</a>
              <a className={styles.secondaryButton} href="#documents">{homepage.hero.secondaryLabel}</a>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="tiovar-about-heading">
        <SectionIntro eyebrow={homepage.about.eyebrow} heading={homepage.about.heading} id="tiovar-about-heading" />
        <div className={styles.identityGrid}>
          <article className={styles.identityLead}>
            <h3>{homepage.about.whoTitle}</h3>
            <p>{homepage.about.whoBody}</p>
          </article>
          <article className={styles.identityWork}>
            <h3>{homepage.about.whatTitle}</h3>
            <p>{homepage.about.whatBody}</p>
            <div className={styles.capabilityList}>
              {homepage.about.capabilities.map((capability) => <span key={capability}>{capability}</span>)}
            </div>
          </article>
        </div>
        <div className={styles.stats} aria-label="TIOVAR industry experience and supply reach">
          {homepage.about.metrics.map((metric) => (
            <div className={styles.stat} key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.soft}`} aria-labelledby="tiovar-routes-heading">
        <div className={styles.wrap}>
          <SectionIntro eyebrow={homepage.routes.eyebrow} heading={homepage.routes.heading} id="tiovar-routes-heading" />
          <div className={styles.routeGrid}>
            {homepage.routes.items.map((route, index) => (
              <article className={styles.route} key={route.title}>
                <span className={styles.routeIndex}>{String(index + 1).padStart(2, '0')}</span>
                <h3>{route.title}</h3><p>{route.description}</p>
                <span className={styles.textAction}>{route.ctaLabel} <span aria-hidden>→</span></span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.navy}`} aria-labelledby="tiovar-applications-heading">
        <div className={styles.wrap}>
          <SectionIntro eyebrow={homepage.applications.eyebrow} heading={homepage.applications.heading} intro={homepage.applications.intro} id="tiovar-applications-heading" />
          <div className={styles.applicationGrid}>
            {homepage.applications.items.map((item, index) => (
              <article key={item.title}><span className={styles.applicationMark}>{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.description}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="tiovar-families-heading">
        <SectionIntro eyebrow={homepage.productFamilies.eyebrow} heading={homepage.productFamilies.heading} intro={homepage.productFamilies.intro} id="tiovar-families-heading" />
        <div className={styles.familyGrid}>
          {homepage.productFamilies.items.map((item, index) => (
            <article key={item.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.description}</p></article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.soft}`} aria-labelledby="tiovar-selection-heading">
        <div className={`${styles.wrap} ${styles.principleGrid}`}>
          <SectionIntro eyebrow={homepage.selection.eyebrow} heading={homepage.selection.heading} intro={homepage.selection.intro} id="tiovar-selection-heading" />
          <div className={styles.factorList}>
            {homepage.selection.factors.map((factor, index) => (
              <article className={styles.factor} key={factor.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{factor.title}</h3><p>{factor.description}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="tiovar-resources-heading">
        <SectionIntro eyebrow={homepage.resources.eyebrow} heading={homepage.resources.heading} id="tiovar-resources-heading" />
        <div className={styles.resourceGrid}>
          {homepage.resources.items.map((resource) => (
            <article key={resource.title}><span>{resource.tag}</span><h3>{resource.title}</h3><p>{resource.description}</p></article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.soft}`} aria-labelledby="tiovar-process-heading">
        <div className={styles.wrap}>
          <SectionIntro eyebrow={homepage.process.eyebrow} heading={homepage.process.heading} id="tiovar-process-heading" />
          <ol className={styles.processGrid}>
            {homepage.process.steps.map((step, index) => (
              <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.description}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="documents" className={`${styles.section} ${styles.wrap} ${styles.documentsGrid}`} aria-labelledby="tiovar-documents-heading">
        <SectionIntro eyebrow={homepage.documents.eyebrow} heading={homepage.documents.heading} intro={homepage.documents.intro} id="tiovar-documents-heading" />
        <div className={styles.documentList}>
          {homepage.documents.items.map((document) => (
            <div className={styles.documentRow} key={document.title}>
              <div><strong>{document.title}</strong><span>{document.context}</span></div>
              <a href="#inquiry">{document.access}</a>
            </div>
          ))}
        </div>
      </section>

      <section id="inquiry" className={styles.inquiry} aria-labelledby="tiovar-inquiry-heading">
        <div className={`${styles.wrap} ${styles.inquiryGrid}`}>
          <div><p className={styles.eyebrow}>{homepage.inquiry.eyebrow}</p><h2 id="tiovar-inquiry-heading">{homepage.inquiry.heading}</h2><p>{homepage.inquiry.intro}</p></div>
          <BrandInquiryForm inquiry={homepage.inquiry} />
        </div>
      </section>

      <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="tiovar-faq-heading">
        <SectionIntro eyebrow={homepage.faq.eyebrow} heading={homepage.faq.heading} id="tiovar-faq-heading" />
        <div className={styles.faqList}>
          {homepage.faq.items.map((item) => (
            <details key={item.question}><summary>{item.question}<span aria-hidden>+</span></summary><p>{item.answer}</p></details>
          ))}
        </div>
      </section>

      <SiteABrandFooter description={homepage.footer.description} />
    </div>
  )
}
