import type {PageCta} from '@/lib/products/page-types'

import layout from './product-layout.module.css'

interface ProductEnquiryPanelProps {
  readonly enquiry: {
    readonly eyebrow: string
    readonly heading: string
    readonly description: string
    readonly ctas: readonly PageCta[]
  }
}

export function ProductEnquiryPanel({
  enquiry,
}: ProductEnquiryPanelProps): React.ReactNode {
  return (
    <section
      aria-labelledby="product-enquiry-heading"
      className={layout.enquiry}
      data-product-section="technical-enquiry"
      id="technical-enquiry"
    >
      <div className={`${layout.wrap} ${layout.enquiryInner}`}>
        <div className={layout.enquiryCopy}>
          <p className={layout.eyebrow}>{enquiry.eyebrow}</p>
          <h2 id="product-enquiry-heading">{enquiry.heading}</h2>
          <p>{enquiry.description}</p>
        </div>
        <div className={layout.enquiryActions}>
          {enquiry.ctas.map((cta, index) => (
            <a
              className={index === 0 ? layout.enquiryPrimary : layout.enquirySecondary}
              href={cta.href}
              key={`${cta.kind}-${cta.label}`}
            >
              {cta.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
