import type {MalaysiaEuMarketPageDto} from '@/lib/wordpress/market-page-v01-types'
import {
  getMalaysiaEuMarketRelatedRouteStates,
  projectMalaysiaEuMarketDynamicState,
} from '@/lib/markets/malaysia-eu-market-projection'

import {
  MalaysiaGlobalFooter,
  MalaysiaGlobalHeader,
} from '../malaysia-global-chrome'
import styles from './malaysia-eu-market-page.module.css'

function Eyebrow({children}: {readonly children: React.ReactNode}) {
  return <p className={styles.eyebrow}>{children}</p>
}

function Action({href, children, secondary = false}: {
  readonly href: string
  readonly children: React.ReactNode
  readonly secondary?: boolean
}) {
  return <a className={secondary ? styles.secondaryButton : styles.primaryButton} href={href}>{children}</a>
}

export function MalaysiaEuMarketPage({
  marketPage,
  structuredData,
}: {
  readonly marketPage: MalaysiaEuMarketPageDto
  readonly structuredData?: React.ReactNode
}) {
  const {relations} = marketPage
  const dynamicState = projectMalaysiaEuMarketDynamicState({
    evidence: marketPage.trade.evidence ?? {},
    importEvidence: marketPage.importRoles.source ?? {},
    routeState: relations.tradeUpdate.routeState,
    datedContext: marketPage.trade.datedContext,
    action: relations.tradeUpdate,
    originHold: marketPage.releaseControls.originHold,
    releaseEnabled: marketPage.releaseControls.releaseEnabled,
    indexingAuthorized: marketPage.releaseControls.indexingAuthorized,
    relatedRoutesReady: marketPage.releaseControls.relatedRoutesReady,
    conversionRuntimeReady: marketPage.releaseControls.conversionRuntimeReady,
    runtimeAcceptanceReady: marketPage.releaseControls.runtimeAcceptanceReady,
    tradeFreshness: marketPage.releaseControls.tradeFreshness,
    relatedRouteStates: getMalaysiaEuMarketRelatedRouteStates(marketPage),
  })

  return (
    <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my">
      {structuredData}
      <MalaysiaGlobalHeader
        chrome={marketPage.globalChrome}
        currentPageId="MARKET-000"
        sourcePageId="MARKET-EU-001"
      />
      <main className={styles.marketMain}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <ol>
            {marketPage.breadcrumb.map((item, index) => (
              <li key={item.targetPageId}>
                {index < marketPage.breadcrumb.length - 1
                  ? <a href={item.href}>{item.label}</a>
                  : <span aria-current="page">{item.label}</span>}
              </li>
            ))}
          </ol>
        </nav>

        <section className={`${styles.section} ${styles.hero}`} data-module="hero" aria-labelledby="eu-hero-heading">
          <div className={styles.heroGrid}>
            <div>
              <Eyebrow>{marketPage.hero.eyebrow}</Eyebrow>
              <h1 id="eu-hero-heading">{marketPage.hero.h1}</h1>
              <p className={styles.lead}>{marketPage.hero.body}</p>
              <div className={styles.actions}>
                <Action href={relations.productsHub.href}>{relations.productsHub.label}</Action>
                <Action href={relations.requestDocuments.href} secondary>{relations.requestDocuments.label}</Action>
                <a className={styles.textAction} href={relations.rfq.href}>{relations.rfq.label}</a>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.tint}`} data-module="supplier-definition" aria-labelledby="supplier-heading">
          <div className={styles.twoColumn}>
            <div>
              <Eyebrow>{marketPage.supplierDefinition.eyebrow}</Eyebrow>
              <h2 id="supplier-heading">{marketPage.supplierDefinition.h2}</h2>
              <p>{marketPage.supplierDefinition.body}</p>
              <p className={styles.note}>{marketPage.supplierDefinition.qualification}</p>
              <div className={styles.actions}>
                <Action href={relations.productsHub.href}>{relations.productsHub.label}</Action>
                <Action href={relations.about.href} secondary>{relations.about.label}</Action>
              </div>
            </div>
            <dl className={styles.factList}>
              {marketPage.supplierDefinition.facts.map((fact) => (
                <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <section className={styles.section} data-module="procurement-path" aria-labelledby="procurement-heading">
          <div className={styles.directAnswer}>
            <h2>{marketPage.procurement.answerHeading}</h2>
            <p>{marketPage.procurement.answer}</p>
          </div>
          <Eyebrow>{marketPage.procurement.eyebrow}</Eyebrow>
          <h2 id="procurement-heading">{marketPage.procurement.h2}</h2>
          <p className={styles.intro}>{marketPage.procurement.intro}</p>
          <ol className={styles.cardGridThree}>
            {marketPage.procurement.items.map((item) => (
              <li className={styles.card} key={item.number}>
                <span className={styles.number}>{item.number}</span>
                <h3>{item.title}</h3><p>{item.body}</p>
              </li>
            ))}
          </ol>
          <p className={styles.boundary}>{marketPage.procurement.boundary}</p>
        </section>

        <section className={`${styles.section} ${styles.tint}`} data-module="applications" aria-labelledby="applications-heading">
          <Eyebrow>{marketPage.applications.eyebrow}</Eyebrow>
          <h2 id="applications-heading">{marketPage.applications.h2}</h2>
          <p className={styles.intro}>{marketPage.applications.intro}</p>
          <div className={styles.cardGridThree}>
            {marketPage.applications.items.map((item) => (
              <article className={styles.card} key={item.targetPageId}>
                <h3>{item.title}</h3><p>{item.body}</p>
                {item.routeState === 'available'
                  ? <a className={styles.textAction} href={item.href}>{item.actionLabel}</a>
                  : null}
              </article>
            ))}
          </div>
          {relations.applicationHub.routeState === 'available'
            ? <div className={styles.actions}><Action href={relations.applicationHub.href}>{relations.applicationHub.label}</Action></div>
            : null}
        </section>

        <section className={styles.section} data-module="grades" aria-labelledby="grades-heading">
          <Eyebrow>{marketPage.grades.eyebrow}</Eyebrow>
          <h2 id="grades-heading">{marketPage.grades.h2}</h2>
          <p className={styles.intro}>{marketPage.grades.intro}</p>
          <div className={styles.gradeGroups}>
            {marketPage.grades.groups.map((group) => (
              <section key={group.label} aria-labelledby={`grade-${group.label.replaceAll(' ', '-').toLowerCase()}`}>
                <h3 id={`grade-${group.label.replaceAll(' ', '-').toLowerCase()}`}>{group.label}</h3>
                <div className={styles.gradeGrid}>
                  {group.items.map((item) => (
                    <article className={styles.gradeCard} key={item.targetPageId}>
                      <strong>{item.label}</strong><p>{item.positioning}</p>
                      <a href={item.href}>{item.actionLabel}<span aria-hidden="true"> →</span></a>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <Action href={marketPage.grades.allGradesAction.href}>{marketPage.grades.allGradesAction.label}</Action>
        </section>

        <section className={`${styles.section} ${styles.tint}`} data-module="documents" aria-labelledby="documents-heading">
          <Eyebrow>{marketPage.documents.eyebrow}</Eyebrow>
          <h2 id="documents-heading">{marketPage.documents.h2}</h2>
          <p className={styles.intro}>{marketPage.documents.intro}</p>
          <div className={styles.cardGridTwo}>
            {marketPage.documents.categories.map((item) => (
              <article className={styles.card} key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>
            ))}
          </div>
          <p className={styles.boundary}>{marketPage.documents.serviceNote}</p>
          <div className={styles.actions}>
            <Action href={relations.requestDocuments.href}>{relations.requestDocuments.label}</Action>
            <Action href={relations.documentsHub.href} secondary>{relations.documentsHub.label}</Action>
          </div>
        </section>

        <section className={styles.section} data-module="import-roles" aria-labelledby="roles-heading">
          <div className={styles.twoColumn}>
            <div>
              <Eyebrow>{marketPage.importRoles.eyebrow}</Eyebrow>
              <h2 id="roles-heading">{marketPage.importRoles.h2}</h2>
              <p>{marketPage.importRoles.answer}</p>
              {dynamicState.importReferenceAvailable && marketPage.importRoles.source ? (
                <>
                  <p className={styles.sourceLine}>{marketPage.importRoles.referenceLine}</p>
                  <a className={styles.textAction} href={marketPage.importRoles.source.url}>{marketPage.importRoles.source.actionLabel}</a>
                </>
              ) : null}
            </div>
            <ul className={styles.checklist}>
              {marketPage.importRoles.checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>

        <section className={`${styles.section} ${styles.origin}`} data-module="origin" aria-labelledby="origin-heading">
          <Eyebrow>{marketPage.origin.eyebrow}</Eyebrow>
          <h2 id="origin-heading">{marketPage.origin.h2}</h2>
          <p>{marketPage.origin.body}</p>
          <p className={styles.sourceLine}>{marketPage.origin.sourceLine}</p>
          <div className={styles.actions}>
            <Action href={relations.about.href}>{relations.about.label}</Action>
            <Action href={relations.requestDocuments.href} secondary>Request Origin &amp; Supplier Information</Action>
          </div>
        </section>

        <section className={`${styles.section} ${styles.tint}`} data-module="trade" aria-labelledby="trade-heading">
          <Eyebrow>{marketPage.trade.eyebrow}</Eyebrow>
          <h2 id="trade-heading">{marketPage.trade.h2}</h2>
          <p>{marketPage.trade.evergreenAnswer}</p>
          <p className={styles.commercialBridge}>{marketPage.trade.commercialBridge}</p>
          {dynamicState.datedTrade ? (
            <aside className={styles.tradeCurrent} data-trade-current>
              <h3>{marketPage.trade.datedHeading}</h3>
              <p>{dynamicState.datedTrade.context}</p>
              <p>{marketPage.trade.clarification}</p>
              <h4 className={styles.tradeReferencesHeading}>Official references</h4>
              <ul className={styles.tradeReferences}>
                {marketPage.trade.references.map((reference) => (
                  <li key={reference.url}>
                    <a href={reference.url}>{reference.label}</a>
                  </li>
                ))}
              </ul>
              <a className={styles.secondaryButton} href={dynamicState.datedTrade.action.href}>
                {dynamicState.datedTrade.action.label}
              </a>
            </aside>
          ) : null}
        </section>

        <section className={styles.section} data-module="destinations" aria-labelledby="destinations-heading">
          <Eyebrow>{marketPage.destinations.eyebrow}</Eyebrow>
          <h2 id="destinations-heading">{marketPage.destinations.h2}</h2>
          <p className={styles.intro}>{marketPage.destinations.intro}</p>
          <ul className={styles.destinationGrid}>
            {marketPage.destinations.items.map((item) => (
              <li key={item.targetPageId}>
                {item.routeState === 'available' ? <a href={item.href}>{item.label}</a> : item.label}
              </li>
            ))}
          </ul>
          <p className={styles.sourceLine}>{marketPage.destinations.helper}</p>
        </section>

        <section className={`${styles.section} ${styles.tint} ${styles.faqSection}`} data-module="buyer-questions" aria-labelledby="questions-heading">
          <div><Eyebrow>BUYER QUESTIONS</Eyebrow><h2 id="questions-heading">Questions From EU Procurement Teams</h2></div>
          <div className={styles.faqList}>
            {marketPage.buyerQuestions.map((item, index) => (
              <details key={item.id} open={index < 2}>
                <summary>{item.question}<span aria-hidden="true">+</span></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.conversion}`} data-module="conversion" aria-labelledby="conversion-heading">
          <div>
            <Eyebrow>{marketPage.conversion.eyebrow}</Eyebrow>
            <h2 id="conversion-heading">{marketPage.conversion.h2}</h2>
            <p>{marketPage.conversion.body}</p>
            <p className={styles.responseNote}>{marketPage.conversion.responseNote}</p>
          </div>
          <div className={styles.conversionActions}>
            <Action href={relations.rfq.href}>{relations.rfq.label}</Action>
            <Action href={relations.requestDocuments.href} secondary>{relations.requestDocuments.label}</Action>
            <a className={styles.textAction} href={relations.sample.href}>{relations.sample.label}</a>
          </div>
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={marketPage.globalChrome} sourcePageId="MARKET-EU-001" />
    </div>
  )
}
