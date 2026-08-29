import {SiteABrandFooter} from '@/components/sites/tio2-a/site-a-brand-footer'
import {SiteABrandShell} from '@/components/sites/tio2-a/site-a-brand-shell'
import type {ProductsHubPageDto} from '@/lib/products/page-types'
import {getSiteConfig} from '@/sites'

import {KnownGradeFilter} from './known-grade-filter'
import {ProductBreadcrumbs} from './product-breadcrumbs'
import {ProductCollectionHero} from './product-collection-hero'
import {ProductDecisionRail} from './product-decision-rail'
import {ProductEnquiryPanel} from './product-enquiry-panel'
import layout from './product-layout.module.css'
import {ProductResourceLinks} from './product-resource-links'
import styles from './products-hub.module.css'

export function ProductsHub({
  page,
}: {
  readonly page: ProductsHubPageDto
}): React.ReactNode {
  const site = getSiteConfig('tio2-a')

  return (
    <SiteABrandShell inquiryHref="/#inquiry" site={site} structuredData={null}>
      <div className={layout.productPage} data-product-level="hub">
        <ProductBreadcrumbs
          items={[{label: 'Home', href: '/'}, {label: 'Products'}]}
        />
        <ProductCollectionHero {...page.hero} />
        <ProductDecisionRail items={page.decisionRail} />

        <section
          aria-labelledby="product-families-heading"
          className={`${layout.section} ${layout.wrap}`}
          data-product-section="product-families"
          id="product-families"
        >
          <div className={layout.sectionHead}>
            <p className={layout.eyebrow}>Product Families</p>
            <h2 id="product-families-heading">Start with the product family</h2>
          </div>
          <div className={styles.familyGrid}>
            {page.families.map((family, index) => (
              <article
                className={styles.familyCard}
                data-product-family={family.slug}
                key={family.slug}
              >
                <span className={styles.familyIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>
                  {family.href ? (
                    <a href={family.href}>{family.title}</a>
                  ) : (
                    family.title
                  )}
                </h3>
                <p>{family.summary}</p>
                <span className={styles.familyCount}>
                  <span data-product-family-count>{family.count}</span>{' '}
                  {family.count === 1 ? 'grade' : 'grades'}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="known-grade-heading"
          className={`${layout.section} ${layout.soft}`}
          data-product-section="known-grade"
        >
          <div className={layout.wrap}>
            <KnownGradeFilter grades={page.knownGrades} />
          </div>
        </section>

        <section
          aria-labelledby="decision-path-heading"
          className={`${layout.section} ${layout.wrap}`}
          data-product-section="decision-path"
        >
          <div className={layout.sectionHead}>
            <p className={layout.eyebrow}>Decision Path</p>
            <h2 id="decision-path-heading">Move from product family to trial grade</h2>
          </div>
          <ol className={styles.decisionSteps}>
            {page.decisionPath.map((step) => (
              <li className={styles.decisionStep} key={`${step.index}-${step.title}`}>
                <span>{step.index}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="application-boundary-heading"
          className={`${layout.section} ${layout.soft}`}
          data-product-section="application-boundary"
        >
          <div className={`${layout.wrap} ${styles.applicationBoundary}`}>
            <div>
              <p className={layout.eyebrow}>Application Starting Point</p>
              <h2 id="application-boundary-heading">Choose the right starting point</h2>
            </div>
            <article className={styles.applicationNote}>
              <h3>{page.applicationBoundary.heading}</h3>
              <p>{page.applicationBoundary.description}</p>
              {page.applicationBoundary.link.href ? (
                <a
                  className={layout.textLink}
                  href={page.applicationBoundary.link.href}
                >
                  {page.applicationBoundary.link.title}
                </a>
              ) : (
                <span className={layout.textLink}>
                  {page.applicationBoundary.link.title}
                </span>
              )}
            </article>
          </div>
        </section>

        <section
          aria-labelledby="technical-resources-heading"
          className={`${layout.section} ${layout.wrap}`}
          data-product-section="technical-resources"
        >
          <div className={layout.sectionHead}>
            <p className={layout.eyebrow}>Technical Resources</p>
            <h2 id="technical-resources-heading">Build a stronger comparison plan</h2>
          </div>
          <ProductResourceLinks resources={page.resources} />
        </section>

        <ProductEnquiryPanel enquiry={page.enquiry} />

        <section
          aria-labelledby="product-faq-heading"
          className={`${layout.section} ${layout.wrap}`}
          data-product-section="faq"
        >
          <div className={layout.sectionHead}>
            <p className={layout.eyebrow}>Common Questions</p>
            <h2 id="product-faq-heading">Frequently Asked Questions</h2>
          </div>
          <div className={styles.faqList}>
            {page.faqs.map((faq) => (
              <details data-product-faq-item key={faq.question}>
                <summary>
                  {faq.question}
                  <span aria-hidden>+</span>
                </summary>
                <div dangerouslySetInnerHTML={{__html: faq.answerHtml}} />
              </details>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="technical-disclaimer-heading"
          className={`${layout.wrap} ${styles.disclaimer}`}
          data-product-section="technical-disclaimer"
        >
          <h2 id="technical-disclaimer-heading">Technical Disclaimer</h2>
          <div dangerouslySetInnerHTML={{__html: page.disclaimerHtml}} />
        </section>
      </div>
      <SiteABrandFooter
        anchorPrefix="/"
        description="Application-specific titanium dioxide products and technical support for industrial formulations."
      />
    </SiteABrandShell>
  )
}
