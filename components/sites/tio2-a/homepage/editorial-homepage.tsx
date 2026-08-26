import {Inter, Source_Serif_4} from 'next/font/google'

import type {SiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-types'

import {ApplicationBriefs} from './application-briefs'
import {ClosingCta} from './closing-cta'
import {DecisionFramework} from './decision-framework'
import {DirectAnswer} from './direct-answer'
import {EditorialFaq} from './editorial-faq'
import {EditorialReviewNote} from './editorial-review-note'
import {EvaluationMethod} from './evaluation-method'
import {EvidenceLibrary} from './evidence-library'
import {Glossary} from './glossary'
import {Hero} from './hero'
import styles from './homepage.module.css'
import {SupplyRouteComparison} from './supply-route-comparison'

const bodyFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-site-a-body',
})

const headingFont = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-site-a-heading',
})

interface EditorialHomepageProps {
  readonly homepage: SiteAEditorialHomepageDto
}

export function EditorialHomepage({homepage}: EditorialHomepageProps) {
  return (
    <div
      className={`${styles.homepage} ${bodyFont.variable} ${headingFont.variable}`}
    >
      <Hero hero={homepage.hero} />
      <DirectAnswer directAnswer={homepage.directAnswer} />
      <DecisionFramework questions={homepage.decisionQuestions} />
      <ApplicationBriefs briefs={homepage.applicationBriefs} />
      <SupplyRouteComparison routes={homepage.supplyRoutes} />
      {homepage.evidenceItems.length > 0 ? (
        <EvidenceLibrary evidenceItems={homepage.evidenceItems} />
      ) : null}
      <EvaluationMethod steps={homepage.evaluationSteps} />
      <EditorialFaq faq={homepage.faq} />
      {homepage.glossary.length > 0 ? (
        <Glossary items={homepage.glossary} />
      ) : null}
      <EditorialReviewNote editorial={homepage.editorial} />
      <ClosingCta closingCta={homepage.closingCta} />
    </div>
  )
}
