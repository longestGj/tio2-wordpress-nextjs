import {SiteABrandFooter} from '@/components/sites/tio2-a/site-a-brand-footer'
import {SiteABrandShell} from '@/components/sites/tio2-a/site-a-brand-shell'
import type {ProductFamilyPageDto} from '@/lib/products/page-types'
import {getSiteConfig} from '@/sites'

import {FamilyProductFilter} from './family-product-filter'
import {ProductBreadcrumbs} from './product-breadcrumbs'
import {ProductCollectionHero} from './product-collection-hero'
import {ProductDecisionRail} from './product-decision-rail'
import {ProductEnquiryPanel} from './product-enquiry-panel'
import styles from './product-family.module.css'
import layout from './product-layout.module.css'
import {ProductResourceLinks} from './product-resource-links'

export function ProductFamily({
  page,
}: {
  readonly page: ProductFamilyPageDto
}): React.ReactNode {
  const site = getSiteConfig('tio2-a')
  const {presentation} = page
  const application = page.applications[0]

  return (
    <div className={layout.productExperience} data-product-experience>
      <SiteABrandShell inquiryHref="/#inquiry" site={site} structuredData={null}>
        <div className={layout.productPage} data-product-level="family">
          <ProductBreadcrumbs
            items={[
              {label: presentation.breadcrumb.homeLabel, href: '/'},
              {label: presentation.breadcrumb.productsLabel, href: '/products'},
              {label: page.identity.title},
            ]}
          />
          <ProductCollectionHero
            {...page.hero}
            presentation={presentation.hero}
          />
          <ProductDecisionRail items={page.decisionRail} />

          <section
            aria-labelledby="family-navigation-heading"
            className={`${layout.section} ${layout.wrap}`}
            data-product-section="family-navigation"
            id="family-candidates"
          >
            <div className={layout.sectionHead}>
              <p className={layout.eyebrow}>
                {presentation.familyNavigation.eyebrow}
              </p>
              <h2 id="family-navigation-heading">
                {presentation.familyNavigation.heading}
              </h2>
              <p className={layout.sectionIntro}>
                {presentation.familyNavigation.intro}
              </p>
            </div>
            <FamilyProductFilter
              copy={presentation.familyNavigation}
              filters={page.filters}
              products={page.products}
            />
          </section>

          <section
            aria-labelledby="grade-comparison-heading"
            className={`${layout.section} ${layout.soft}`}
            data-product-section="grade-comparison"
          >
            <div className={layout.wrap}>
              <div className={layout.sectionHead}>
                <p className={layout.eyebrow}>
                  {presentation.comparison.eyebrow}
                </p>
                <h2 id="grade-comparison-heading">
                  {presentation.comparison.heading}
                </h2>
                <p className={layout.sectionIntro}>
                  {presentation.comparison.intro}
                </p>
              </div>
              <div
                aria-label={presentation.comparison.regionLabel}
                className={styles.comparisonRegion}
                role="region"
                tabIndex={0}
              >
                <table className={styles.comparisonTable}>
                  <caption>{page.comparison.caption}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{presentation.comparison.headers.grade}</th>
                      <th scope="col">
                        {presentation.comparison.headers.applicationFocus}
                      </th>
                      <th scope="col">
                        {presentation.comparison.headers.performanceFocus}
                      </th>
                      <th scope="col">
                        {presentation.comparison.headers.surfaceTreatmentPositioning}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.comparison.products.map((product) => (
                      <tr
                        data-family-comparison-row={product.productId}
                        key={product.productId}
                      >
                        <th scope="row">{product.productId}</th>
                        <td>{product.applicationFocus}</td>
                        <td>{product.performanceFocus}</td>
                        <td>{product.surfaceTreatmentPositioning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.comparisonNote}>
                <strong>{presentation.comparison.noteLabel}</strong>{' '}
                {presentation.comparison.note}
              </div>
            </div>
          </section>

          <section
            aria-labelledby="selection-method-heading"
            className={`${layout.section} ${layout.wrap}`}
            data-product-section="selection-method"
          >
            <div className={styles.selectionGrid}>
              <div>
                <p className={layout.eyebrow}>{page.selectionMethod.eyebrow}</p>
                <h2 id="selection-method-heading">
                  {page.selectionMethod.heading}
                </h2>
                <p className={layout.sectionIntro}>
                  {page.selectionMethod.description}
                </p>
              </div>
              <article className={styles.applicationNote}>
                <h3>{presentation.selectionApplication.heading}</h3>
                <p>{presentation.selectionApplication.description}</p>
                {application?.href ? (
                  <a className={styles.applicationAction} href={application.href}>
                    {presentation.selectionApplication.actionLabel}
                  </a>
                ) : (
                  <span className={styles.applicationAction}>
                    {presentation.selectionApplication.actionLabel}
                  </span>
                )}
              </article>
            </div>
          </section>

          <section
            aria-labelledby="validation-method-heading"
            className={`${layout.section} ${layout.soft}`}
            data-product-section="validation-method"
          >
            <div className={layout.wrap}>
              <div className={layout.sectionHead}>
                <p className={layout.eyebrow}>{presentation.validation.eyebrow}</p>
                <h2 id="validation-method-heading">
                  {presentation.validation.heading}
                </h2>
              </div>
              <ol className={styles.validationList}>
                {page.validationSteps.map((step) => (
                  <li key={`${step.index}-${step.title}`}>
                    <span>{step.index}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section
            aria-labelledby="family-resources-heading"
            className={`${layout.section} ${layout.wrap}`}
            data-product-section="technical-resources"
          >
            <div className={layout.sectionHead}>
              <p className={layout.eyebrow}>{presentation.resources.eyebrow}</p>
              <h2 id="family-resources-heading">{presentation.resources.heading}</h2>
            </div>
            <ProductResourceLinks
              cards={presentation.resources.cards}
              resources={page.resources}
            />
          </section>

          <ProductEnquiryPanel
            contextFields={presentation.enquiryContextFields}
            enquiry={page.enquiry}
          />

          <section
            aria-labelledby="family-faq-heading"
            className={`${layout.section} ${layout.wrap}`}
            data-product-section="faq"
          >
            <div className={layout.sectionHead}>
              <p className={layout.eyebrow}>{presentation.faq.eyebrow}</p>
              <h2 id="family-faq-heading">{presentation.faq.heading}</h2>
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
            aria-labelledby="family-disclaimer-heading"
            className={`${layout.wrap} ${styles.disclaimer}`}
            data-product-section="technical-disclaimer"
          >
            <h2 id="family-disclaimer-heading">
              {presentation.disclaimerLabel}
            </h2>
            <div dangerouslySetInnerHTML={{__html: page.disclaimerHtml}} />
          </section>
        </div>
        <SiteABrandFooter
          anchorPrefix="/"
          description={presentation.footerDescription}
        />
      </SiteABrandShell>
    </div>
  )
}
