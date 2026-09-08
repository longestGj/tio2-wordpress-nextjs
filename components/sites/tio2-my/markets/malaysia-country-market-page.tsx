import {Inter} from 'next/font/google'
import type {ReactNode} from 'react'

import type {
  MalaysiaCountryMarketAction,
  MalaysiaCountryMarketParagraph,
} from '@/lib/markets/malaysia-country-market-contracts'
import type {MalaysiaCountryMarketPageDto} from '@/lib/wordpress/market-country-v01-types'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-country-market-page.module.css'

const countryMarketFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-my-country-market',
})

function Paragraph({paragraph}: {readonly paragraph: MalaysiaCountryMarketParagraph}) {
  const rendered: ReactNode[] = []
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index]
    const next = paragraph.runs[index + 1]
    if (run.href && next && !next.href && /^[.,;:!?]+$/u.test(next.text)) {
      rendered.push(<span key={`${run.href}-${index}`} className={styles.punctuationKeep} data-punctuation-keep="true">
        <a href={run.href} rel={run.external ? 'external noopener noreferrer' : undefined}>{run.text}</a>
        <span>{next.text}</span>
      </span>)
      index += 1
    } else if (run.href) {
      rendered.push(<a key={`${run.href}-${index}`} href={run.href}
        rel={run.external ? 'external noopener noreferrer' : undefined}>{run.text}</a>)
    } else {
      rendered.push(<span key={`${run.text}-${index}`}>{run.text}</span>)
    }
  }
  return <p>{rendered}</p>
}

function Actions({actions = [], className = ''}: {
  readonly actions?: readonly MalaysiaCountryMarketAction[]
  readonly className?: string
}) {
  return <div className={[styles.actions, className].filter(Boolean).join(' ')}>{actions.map((action) =>
    <a key={`${action.targetPageId}-${action.href}`} className={styles[action.style]} href={action.href}
      rel={action.href.startsWith('https://') ? 'external noopener noreferrer' : undefined}>{action.label}</a>)}</div>
}

export function MalaysiaCountryMarketPage({marketPage: page, structuredData}: {
  readonly marketPage: MalaysiaCountryMarketPageDto
  readonly structuredData?: ReactNode
}) {
  return <div className={`${styles.site} ${countryMarketFont.variable}`} data-site-scope="tio2-my" data-site-id="tio2-my" data-page-id={page.identity.pageId}>
    {structuredData}
    <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="MARKET-000" sourcePageId={page.identity.pageId} />
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb"><ol>
        {page.breadcrumb.map((item, index) => <li key={item.targetPageId}>{index < page.breadcrumb.length - 1
          ? <a href={item.href}>{item.label}</a>
          : <span aria-current="page">{item.label}</span>}</li>)}
      </ol></nav>
      {page.modules.map((module, moduleIndex) => <section key={module.id} data-module={module.id}
        className={[styles.section, module.kind === 'hero' ? styles.hero : '', module.kind === 'quote' ? styles.quote : ''].join(' ')}
        aria-labelledby={`${module.id}-heading`}>
        <div className={styles.reading}>
          {module.kind === 'hero'
            ? <h1 id={`${module.id}-heading`}>{module.heading}</h1>
            : <h2 id={`${module.id}-heading`}>{module.heading}</h2>}
          {page.identity.pageId === 'MARKET-IN-001' && module.id === 'documents'
            ? <>
                {module.paragraphs?.slice(0, -1).map((paragraph, index) =>
                  <Paragraph key={`${module.id}-p-${index}`} paragraph={paragraph} />)}
                <Actions actions={module.actions?.slice(0, 2)} className={styles.documentActions} />
                {module.paragraphs?.at(-1) ? <Paragraph paragraph={module.paragraphs.at(-1)!} /> : null}
                <Actions actions={module.actions?.slice(2)} className={styles.tradeAction} />
              </>
            : module.paragraphs?.map((paragraph, index) => <Paragraph key={`${module.id}-p-${index}`} paragraph={paragraph} />)}
          {module.subsections?.length ? <div className={styles.contexts}>{module.subsections.map((subsection, index) =>
            <section key={`${module.id}-sub-${index}`} className={styles.context} aria-labelledby={`${module.id}-sub-${index}-heading`}>
              <h3 id={`${module.id}-sub-${index}-heading`}>{subsection.heading}</h3>
              {subsection.paragraphs.map((paragraph, paragraphIndex) => <Paragraph key={paragraphIndex} paragraph={paragraph} />)}
              <Actions actions={subsection.actions} />
            </section>)}</div> : null}
          {module.list ? <ul>{module.list.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          {page.identity.pageId === 'MARKET-EU-ES' && module.id === 'quote'
            ? <>
                {module.afterList?.at(0) ? <Paragraph paragraph={module.afterList.at(0)!} /> : null}
                <Actions actions={module.actions?.slice(0, 1)} />
                {module.afterList?.slice(1).map((paragraph, index) =>
                  <Paragraph key={`${module.id}-after-${index + 1}`} paragraph={paragraph} />)}
                <Actions actions={module.actions?.slice(1)} className={styles.relatedActions} />
              </>
            : <>
                {module.afterList?.map((paragraph, index) =>
                  <Paragraph key={`${module.id}-after-${index}`} paragraph={paragraph} />)}
                {page.identity.pageId === 'MARKET-IN-001' && module.id === 'documents'
                  ? null
                  : <Actions actions={module.actions} />}
              </>}
          {moduleIndex === page.modules.length - 1 ? <span className={styles.endMarker} aria-hidden="true" /> : null}
        </div>
      </section>)}
    </main>
    <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId={page.identity.pageId} />
  </div>
}
