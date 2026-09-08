import {Inter} from 'next/font/google'
import type {ReactNode} from 'react'
import type {
  BrazilPtAction,
  BrazilPtInlineLink,
  BrazilPtLanguageSpan,
  MalaysiaBrazilPtMarketPageDto,
} from '@/lib/wordpress/market-page-brazil-pt-v02-types'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-brazil-pt-market-page.module.css'

const brazilMarketFont=Inter({subsets:['latin'],weight:['400','500','600','700'],display:'swap',variable:'--font-brazil-market'})

function hrefFor(action: BrazilPtAction): string {
  if (!action.context) return action.href
  const params = new URLSearchParams({source_page_id: action.context.sourcePageId})
  if (action.context.destinationCountry) params.set('destination_country', action.context.destinationCountry)
  return `${action.href}?${params.toString()}`
}

function RichParagraph({text, links, languageSpans}: {
  readonly text: string
  readonly links: readonly BrazilPtInlineLink[]
  readonly languageSpans: readonly BrazilPtLanguageSpan[]
}) {
  const tokens = [
    ...links.map(link => ({start: text.indexOf(link.label), label: link.label, node: <a key={`link-${link.targetPageId}`} href={hrefFor(link)}>{link.label}</a>})),
    ...languageSpans.map(span => ({start: text.indexOf(span.label), label: span.label, node: <span key={`lang-${span.label}`} lang={span.language}>{span.label}</span>})),
  ].filter(token => token.start >= 0).sort((left, right) => left.start - right.start)
  const parts: ReactNode[] = []
  let cursor = 0
  for (const token of tokens) {
    if (token.start < cursor) continue
    parts.push(text.slice(cursor, token.start), token.node)
    cursor = token.start + token.label.length
  }
  parts.push(text.slice(cursor))
  return <p>{parts}</p>
}

function Actions({actions}: {readonly actions: readonly BrazilPtAction[]}) {
  return <div className={styles.actions}>{actions.map((action, index) =>
    <a key={`${action.targetPageId}-${action.label}`} className={`${styles.action} ${index === 0 ? styles.primary : styles.secondary}`} href={hrefFor(action)}>{action.label}</a>,
  )}</div>
}

export function MalaysiaBrazilPtMarketPage({marketPage: page, structuredData}: {
  readonly marketPage: MalaysiaBrazilPtMarketPageDto
  readonly structuredData?: ReactNode
}) {
  return <div className={brazilMarketFont.variable} data-site-scope="tio2-my" data-page-id="MARKET-BR-PT">
    {structuredData}
    <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="MARKET-000" sourcePageId="MARKET-BR-PT"/>
    <main className={styles.main} lang="pt-BR">
      <nav aria-label="Navegação estrutural" className={styles.breadcrumb}><ol>{page.breadcrumb.map((item, index) => <li key={item.targetPageId}>{index < page.breadcrumb.length - 1 ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>
      {page.modules.map((module, moduleIndex) => <section
        key={module.id}
        data-module={module.id}
        aria-labelledby={`${module.id}-heading`}
        className={`${styles.section} ${styles[`module${moduleIndex + 1}`]}`}
      >
        <div className={styles.container}>
          {moduleIndex === 0 ? <h1 id={`${module.id}-heading`}>{module.heading}</h1> : <h2 id={`${module.id}-heading`}>{module.heading}</h2>}
          <div className={styles.copy}>
            <RichParagraph text={module.paragraphs[0]!} links={module.inlineLinks.filter(link => link.paragraphIndex === 0)} languageSpans={module.languageSpans.filter(span => span.paragraphIndex === 0)}/>
            {module.cards.length > 0 && <div className={styles.cards}>{module.cards.map(card => <article key={card.heading}>
              <h3>{card.heading}</h3>
              {card.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              <a className={styles.cardAction} href={hrefFor(card.action)}>{card.action.label}</a>
            </article>)}</div>}
            {moduleIndex === 1 && <RichParagraph text={module.paragraphs[1]!} links={[]} languageSpans={[]}/>}
            {moduleIndex === 0 && <Actions actions={module.actions}/>}
            {moduleIndex === 0 && <p className={styles.languageNotice}>{page.languageNotice}</p>}
            {moduleIndex === 2 && module.paragraphs.slice(1).map((paragraph, offset) => <RichParagraph key={offset + 1} text={paragraph} links={module.inlineLinks.filter(link => link.paragraphIndex === offset + 1)} languageSpans={module.languageSpans.filter(span => span.paragraphIndex === offset + 1)}/>)}
            {module.listItems.length > 0 && <ul>{module.listItems.map(item => <li key={item}>{item}</li>)}</ul>}
            {moduleIndex === 4 && <RichParagraph text={module.paragraphs[1]!} links={[]} languageSpans={[]}/>}
            {moduleIndex !== 0 && module.actions.length > 0 && <Actions actions={module.actions}/>}
          </div>
        </div>
      </section>)}
    </main>
    <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="MARKET-BR-PT"/>
  </div>
}
