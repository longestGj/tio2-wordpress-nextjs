import Image from 'next/image'

import type {ProductsHubPresentation} from '@/lib/products/page-types'

import layout from './product-layout.module.css'

interface ProductCollectionHeroProps {
  readonly eyebrow: string
  readonly headline: string
  readonly directAnswer: string
  readonly image: string
  readonly presentation: ProductsHubPresentation['hero']
}

export function ProductCollectionHero({
  eyebrow,
  headline,
  directAnswer,
  image,
  presentation,
}: ProductCollectionHeroProps): React.ReactNode {
  const isHubImage = image.endsWith('/products-hub-hero.jpg')

  return (
    <section
      aria-labelledby="product-hero-heading"
      className={layout.hero}
      data-product-section="hero"
    >
      <Image
        alt={presentation.imageAlt}
        className={layout.heroImage}
        fetchPriority="high"
        height={isHubImage ? 788 : 1024}
        priority
        sizes="(max-width: 700px) 100vw, 62vw"
        src={image}
        width={isHubImage ? 1400 : 1536}
      />
      <div className={`${layout.wrap} ${layout.heroInner}`}>
        <div className={layout.heroCopy}>
          <p className={layout.eyebrow}>{eyebrow}</p>
          <h1 id="product-hero-heading">{headline}</h1>
          <div
            className={layout.heroAnswer}
            dangerouslySetInnerHTML={{__html: directAnswer}}
          />
          <div className={layout.heroActions}>
            <a
              className={layout.heroPrimaryAction}
              href={presentation.familyAction.href}
            >
              {presentation.familyAction.label}
            </a>
            <a
              className={layout.heroSecondaryAction}
              href={presentation.enquiryAction.href}
            >
              {presentation.enquiryAction.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
