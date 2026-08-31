import type {MalaysiaMarketHubDto} from '@/lib/wordpress/market-hub-v01-types'

import {
  MalaysiaGlobalFooter,
  MalaysiaGlobalHeader,
} from '../malaysia-global-chrome'
import styles from './malaysia-market-hub.module.css'

function Eyebrow({children}: {readonly children: React.ReactNode}) {
  return <p className={styles.eyebrow}>{children}</p>
}

export function MalaysiaMarketHub({
  marketHub,
  structuredData,
}: {
  readonly marketHub: MalaysiaMarketHubDto
  readonly structuredData?: React.ReactNode
}) {
  const euParent = marketHub.destinations.items[0]
  const euCountries = marketHub.destinations.items.slice(1, 7)
  const standalone = marketHub.destinations.items.slice(7)

  return (
    <div className={styles.site} data-site-id="tio2-my" data-site-scope="tio2-my">
      {structuredData}
      <MalaysiaGlobalHeader
        chrome={marketHub.globalChrome}
        currentPageId="MARKET-000"
        sourcePageId="MARKET-000"
      />
      <main>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <ol>
            {marketHub.breadcrumb.map((item, index) => (
              <li key={item.targetPageId}>
                {index === marketHub.breadcrumb.length - 1
                  ? <span aria-current="page">{item.label}</span>
                  : <a href={item.href}>{item.label}</a>}
              </li>
            ))}
          </ol>
        </nav>

        <section className={`${styles.section} ${styles.hero}`} data-module="hero" aria-labelledby="market-hero-heading">
          <div className={styles.heroCopy}>
            <Eyebrow>{marketHub.hero.eyebrow}</Eyebrow>
            <h1 id="market-hero-heading">{marketHub.hero.h1}</h1>
            <p>{marketHub.hero.body}</p>
            <a className={styles.primaryButton} href={marketHub.hero.primaryAction.href}>
              {marketHub.hero.primaryAction.label}
            </a>
          </div>
          <aside className={styles.chapter} aria-label="Markets chapter">
            <div><strong aria-hidden="true">{marketHub.hero.chapterNumber}</strong><span>{marketHub.hero.chapterLabel}</span></div>
            <b>{marketHub.hero.chapterMarkets}</b>
            <p>{marketHub.hero.chapterDescription}</p>
          </aside>
        </section>

        <section
          id={marketHub.destinations.anchorId}
          className={`${styles.section} ${styles.tint}`}
          data-module="destination-market"
          aria-labelledby="destination-heading"
        >
          <div className={styles.sectionIntro}>
            <Eyebrow>{marketHub.destinations.eyebrow}</Eyebrow>
            <h2 id="destination-heading">{marketHub.destinations.h2}</h2>
            <p>{marketHub.destinations.intro}</p>
          </div>
          <div className={styles.destinationGrid}>
            <article className={styles.euCard}>
              <Eyebrow>REGIONAL OVERVIEW</Eyebrow>
              <h3>{euParent.label}</h3>
              <p>{euParent.description}</p>
              <a className={styles.outlineButton} data-market-action={euParent.targetPageId} href={euParent.href}>
                {euParent.actionLabel}
              </a>
              <h4>EU country destinations</h4>
              <div className={styles.countryGrid}>
                {euCountries.map((item) => (
                  <a key={item.targetPageId} data-market-action={item.targetPageId} href={item.href}>
                    <span>{item.actionLabel}</span><span aria-hidden="true">›</span>
                  </a>
                ))}
              </div>
            </article>
            <div className={styles.standaloneGrid}>
              {standalone.map((item) => (
                <article key={item.targetPageId}>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                  <a data-market-action={item.targetPageId} href={item.href}>
                    <span>{item.actionLabel}</span><span aria-hidden="true">›</span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} data-module="how-to-choose" aria-labelledby="choice-heading">
          <div className={styles.sectionIntro}>
            <Eyebrow>{marketHub.choice.eyebrow}</Eyebrow>
            <h2 id="choice-heading">{marketHub.choice.h2}</h2>
            <p>{marketHub.choice.intro}</p>
          </div>
          <ol className={styles.choiceGrid}>
            {marketHub.choice.items.map((item, index) => (
              <li key={item.title}>
                <span>{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
          <div className={styles.directAnswer}>
            <strong>Direct answer</strong><p>{marketHub.choice.directAnswer}</p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.tint}`} data-module="next-procurement-check" aria-labelledby="procurement-heading">
          <div className={styles.sectionIntro}>
            <Eyebrow>{marketHub.procurement.eyebrow}</Eyebrow>
            <h2 id="procurement-heading">{marketHub.procurement.h2}</h2>
            <p>{marketHub.procurement.intro}</p>
          </div>
          <div className={styles.procurementGrid}>
            {marketHub.procurement.items.map((item) => (
              <article key={item.targetPageId}>
                <span className={styles.cardMark} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <a className={styles.outlineButton} href={item.href}>{item.actionLabel}</a>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.trade}`} data-module="current-information" aria-labelledby="trade-heading">
          <div>
            <Eyebrow>{marketHub.trade.eyebrow}</Eyebrow>
            <h2 id="trade-heading">{marketHub.trade.h2}</h2>
            <p>{marketHub.trade.body}</p>
          </div>
          <aside>
            <Eyebrow>RESOURCES</Eyebrow>
            <strong>{marketHub.trade.criteria}</strong>
            <a href={marketHub.trade.action.href}>
              <span>{marketHub.trade.action.label}</span><span aria-hidden="true">›</span>
            </a>
          </aside>
        </section>

        <section className={`${styles.section} ${styles.tint} ${styles.questions}`} data-module="buyer-questions" aria-labelledby="questions-heading">
          <Eyebrow>BUYER QUESTIONS</Eyebrow>
          <h2 id="questions-heading">Questions buyers ask before choosing a market page</h2>
          <div className={styles.questionList}>
            {marketHub.buyerQuestions.map((item) => (
              <article key={item.id}>
                <span>{item.id}</span>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={marketHub.globalChrome} sourcePageId="MARKET-000" />
    </div>
  )
}
