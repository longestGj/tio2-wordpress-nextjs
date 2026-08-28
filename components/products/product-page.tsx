import type {ProductPageDto} from '@/lib/products/types'

import {EnquiryDetails} from './enquiry-details'
import {ProductExtensionSlot} from './extension-registry'
import {PackagingDocuments} from './packaging-documents'
import {PerformancePriorities} from './performance-priorities'
import {ProductCta} from './product-cta'
import {ProductEvidence} from './product-evidence'
import {ProductFaq} from './product-faq'
import {ProductHero} from './product-hero'
import styles from './product-page.module.css'
import {ProductSnapshot} from './product-snapshot'
import {RecommendedApplications} from './recommended-applications'
import {RelatedContent} from './related-content'
import {SelectionCheck} from './selection-check'
import {TechnicalDisclaimer} from './technical-disclaimer'
import {TypicalProperties} from './typical-properties'
import {ValidationGuide} from './validation-guide'

interface ProductPageProps {
  readonly displayMode?: 'release-look' | 'standard'
  readonly product: ProductPageDto
}

export function ProductPage({
  displayMode = 'standard',
  product,
}: ProductPageProps) {
  const showSharedConversionContent = displayMode === 'standard'

  return (
    <article className={styles.page} data-product-id={product.identity.productId}>
      <ProductHero
        ctas={product.ctas}
        hero={product.hero}
        identity={product.identity}
        showCta={showSharedConversionContent}
      />
      <ProductSnapshot snapshot={product.snapshot} />
      <ProductExtensionSlot insertionPoint="after-snapshot" product={product} />
      <SelectionCheck selection={product.selection} />
      <PerformancePriorities priorities={product.performancePriorities} />
      <RecommendedApplications applications={product.recommendedApplications} />
      <ProductEvidence evidenceHtml={product.evidenceHtml} />
      <ProductExtensionSlot
        insertionPoint="after-product-evidence"
        product={product}
      />
      <TypicalProperties
        ctas={product.ctas}
        productId={product.identity.productId}
        properties={product.typicalProperties}
        showCta={showSharedConversionContent}
      />
      <ValidationGuide checklist={product.validationChecklist} />
      <ProductExtensionSlot
        insertionPoint="after-validation-guide"
        product={product}
      />
      {showSharedConversionContent ? (
        <EnquiryDetails fields={product.enquiryFields} />
      ) : null}
      <PackagingDocuments
        packaging={product.packaging}
        tdsAccess={product.tdsAccess}
      />
      <ProductFaq faqs={product.faqs} />
      <RelatedContent relatedLinks={product.relatedLinks} />
      {showSharedConversionContent ? (
        <>
          <ProductCta
            ctas={product.ctas}
            placement="final"
            productId={product.identity.productId}
          />
          <TechnicalDisclaimer disclaimerHtml={product.disclaimerHtml} />
        </>
      ) : null}
    </article>
  )
}
