import type {ReactNode} from 'react'
import type {BrazilEnAction, BrazilEnInlineLink, MalaysiaBrazilEnMarketPageDto} from '@/lib/wordpress/market-page-brazil-en-v01-types'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import styles from './malaysia-brazil-en-market-page.module.css'

function hrefFor(action: BrazilEnAction): string {
  if (!action.context) return action.href
  const params = new URLSearchParams({source_page_id: action.context.sourcePageId})
  if (action.context.destinationCountry) params.set('destination_country', action.context.destinationCountry)
  return `${action.href}?${params.toString()}`
}

function InlineParagraph({text, links}: {readonly text: string; readonly links: readonly BrazilEnInlineLink[]}) {
  if (!links.length) return <p>{text}</p>
  const parts: ReactNode[] = []
  let cursor = 0
  for (const link of links) {
    const start = text.indexOf(link.label, cursor)
    if (start < 0) continue
    parts.push(text.slice(cursor, start))
    parts.push(<a key={`${link.targetPageId}-${start}`} href={hrefFor(link)}>{link.label}</a>)
    cursor = start + link.label.length
  }
  parts.push(text.slice(cursor))
  return <p>{parts}</p>
}

function Actions({actions}: {readonly actions: readonly BrazilEnAction[]}) {
  return <div className={styles.actions}>{actions.map((action, index) =>
    <a key={`${action.targetPageId}-${action.label}`} className={`${styles.action} ${index === 0 ? styles.primary : styles.secondary}`} href={hrefFor(action)}>{action.label}</a>,
  )}</div>
}

export function MalaysiaBrazilEnMarketPage({marketPage: page, structuredData}: {
  readonly marketPage: MalaysiaBrazilEnMarketPageDto
  readonly structuredData?: ReactNode
}) {
  return <div data-site-scope="tio2-my" data-page-id="MARKET-BR-EN">
    {structuredData}
    <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="MARKET-000" sourcePageId="MARKET-BR-EN"/>
    <main className={styles.main}>
      {page.modules.map((module, moduleIndex) => <section key={module.id} data-module={module.id} aria-labelledby={`${module.id}-heading`} className={`${styles.section} ${moduleIndex === 0 ? styles.hero : ''} ${moduleIndex === 4 ? styles.final : ''}`}>
        <div className={styles.container}>
          {moduleIndex === 0 && <nav aria-label="Breadcrumb" className={styles.breadcrumb}><ol>{page.breadcrumb.map((item, index) => <li key={item.targetPageId}>{index < page.breadcrumb.length - 1 ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>}
          {moduleIndex === 0 ? <h1 id={`${module.id}-heading`}>{module.heading}</h1> : <h2 id={`${module.id}-heading`}>{module.heading}</h2>}
          <div className={styles.copy}>
            {module.paragraphs.slice(0, module.id === 'BR-EN-02' || module.id === 'BR-EN-05' ? 1 : undefined).map((paragraph, index) => <InlineParagraph key={index} text={paragraph} links={module.inlineLinks.filter(link => link.paragraphIndex === index)}/>)}
            {module.cards.length > 0 && <div className={styles.cards}>{module.cards.map(card => <article key={card.heading}>
              <h3>{card.heading}</h3>{card.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              <a className={styles.cardAction} href={hrefFor(card.action)}>{card.action.label}</a>
            </article>)}</div>}
            {module.id === 'BR-EN-02' && <InlineParagraph text={module.paragraphs[1]!} links={[]}/>}
            {module.listItems.length > 0 && <ul>{module.listItems.map(item => <li key={item}>{item}</li>)}</ul>}
            {module.id === 'BR-EN-05' && <InlineParagraph text={module.paragraphs[1]!} links={[]}/>}
            {module.actions.length > 0 && <Actions actions={module.actions}/>}
          </div>
        </div>
      </section>)}
    </main>
    <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="MARKET-BR-EN"/>
  </div>
}
