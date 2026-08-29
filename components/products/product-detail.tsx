import Image from 'next/image'

import {SiteABrandFooter} from '@/components/sites/tio2-a/site-a-brand-footer'
import {SiteABrandShell} from '@/components/sites/tio2-a/site-a-brand-shell'
import type {ProductDetailPageDto} from '@/lib/products/page-types'
import {getSiteConfig} from '@/sites'

import {PackagingDocumentsV05} from './packaging-documents'
import {PerformancePrioritiesV05} from './performance-priorities'
import {ProductBreadcrumbs} from './product-breadcrumbs'
import {ProductCtaV05} from './product-cta'
import {ProductDecisionRail} from './product-decision-rail'
import styles from './product-detail.module.css'
import {ProductFaqV05} from './product-faq'
import layout from './product-layout.module.css'
import {ProductSnapshotV05} from './product-snapshot'
import {RelatedContentV05} from './related-content'
import {SelectionCheckV05} from './selection-check'
import {TechnicalDisclaimerV05} from './technical-disclaimer'
import {TypicalPropertiesV05} from './typical-properties'
import {ValidationGuideV05} from './validation-guide'

export function ProductDetail({
  page,
}: {
  readonly page: ProductDetailPageDto
}): React.ReactNode {
  const site = getSiteConfig('tio2-a')
  const {presentation} = page
  const application = page.applicationContext.application

  return (
    <div className={styles.experience} data-product-experience>
      <SiteABrandShell inquiryHref="/#inquiry" site={site} structuredData={null}>
        <div
          className={`${layout.productPage} ${styles.page}`}
          data-product-id={page.identity.productId}
          data-product-level="detail"
        >
          <ProductBreadcrumbs
            items={[
              {
                label: presentation.breadcrumb.homeLabel,
                href: presentation.breadcrumb.homeHref ?? undefined,
              },
              {
                label: presentation.breadcrumb.productsLabel,
                href: presentation.breadcrumb.productsHref ?? undefined,
              },
              {
                label: presentation.breadcrumb.familyLabel,
                href: presentation.breadcrumb.familyHref ?? undefined,
              },
              {label: page.identity.productId},
            ]}
          />

          <section
            aria-labelledby="detail-hero-heading"
            className={styles.hero}
            data-product-section="hero"
          >
            <Image
              alt={presentation.hero.imageAlt}
              className={styles.heroImage}
              fetchPriority="high"
              height={1024}
              preload
              sizes="(max-width: 700px) 100vw, 62vw"
              src={page.hero.image}
              width={1536}
            />
            <div className={`${styles.wrap} ${styles.heroInner}`}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>{page.hero.eyebrow}</p>
                <h1 id="detail-hero-heading">{page.hero.headline}</h1>
                <div
                  className={styles.heroAnswer}
                  dangerouslySetInnerHTML={{__html: page.hero.directAnswer}}
                />
                <ProductCtaV05 ctas={page.hero.ctas} placement="hero" />
              </div>
            </div>
          </section>

          <ProductDecisionRail items={page.decisionRail} />
          <ProductSnapshotV05 copy={presentation.snapshot} items={page.snapshot} />
          <TypicalPropertiesV05
            copy={presentation.technicalData}
            ctas={page.hero.ctas}
            note={page.technicalNote}
            properties={page.technicalProperties}
          />
          <SelectionCheckV05 copy={presentation.fitCheck} selection={page.fitCheck} />
          <PerformancePrioritiesV05
            copy={presentation.formulationPriorities}
            priorities={page.formulationPriorities}
          />
          <ValidationGuideV05
            copy={presentation.validation}
            steps={page.validationSteps}
          />

          <section
            aria-labelledby="detail-application-context-heading"
            className={`${styles.section} ${styles.soft}`}
            data-product-section="application-context"
          >
            <div className={`${styles.wrap} ${styles.applicationGrid}`}>
              <div>
                <p className={styles.eyebrow}>{page.applicationContext.eyebrow}</p>
                <h2 id="detail-application-context-heading">
                  {page.applicationContext.heading}
                </h2>
                <p className={styles.sectionIntro}>
                  {page.applicationContext.description}
                </p>
              </div>
              <article className={styles.applicationCard}>
                <h3>{application.title}</h3>
                <p>{presentation.applicationContext.cardDescription}</p>
                {application.href ? (
                  <a href={application.href}>
                    {presentation.applicationContext.actionLabel}
                  </a>
                ) : (
                  <span>{presentation.applicationContext.actionLabel}</span>
                )}
              </article>
            </div>
          </section>

          <PackagingDocumentsV05
            copy={presentation.enquiryPreparation}
            enquiry={page.enquiryPreparation}
          />
          <ProductFaqV05 copy={presentation.faq} faqs={page.faqs} />
          <RelatedContentV05 copy={presentation.related} links={page.relatedLinks} />
          <ProductCtaV05
            copy={presentation.finalCta}
            ctas={page.finalCtas}
            placement="final"
          />
          <TechnicalDisclaimerV05
            disclaimerHtml={page.disclaimerHtml}
            label={presentation.disclaimerLabel}
          />
        </div>
        <SiteABrandFooter
          anchorPrefix="/"
          description={presentation.footerDescription}
        />
      </SiteABrandShell>
    </div>
  )
}
