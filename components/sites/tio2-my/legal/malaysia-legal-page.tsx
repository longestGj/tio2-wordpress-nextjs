import {Fragment, type ReactNode} from 'react'
import Link from 'next/link'

import {parseLegalMarkdown} from '@/lib/legal/markdown'
import type {MalaysiaLegalPageDto} from '@/lib/wordpress/legal-pages-v01-types'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '../malaysia-global-chrome'
import {MalaysiaCookieSettingsTrigger} from '../consent/malaysia-cookie-settings'
import styles from './malaysia-legal-page.module.css'

interface Props {
  readonly page: MalaysiaLegalPageDto
  readonly structuredData?: ReactNode
}

function plainWithBreaks(value: string, key: string): ReactNode[] {
  return value.split(/\n/).flatMap((part, index, all) => [part, ...(index < all.length - 1 ? [<br key={`${key}-br-${index}`} />] : [])])
}

function inline(markdown: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g
  const nodes: ReactNode[] = []
  let cursor = 0
  for (const match of markdown.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > cursor) nodes.push(...plainWithBreaks(markdown.slice(cursor, index).replace(/ {2}\n/g, '\n'), `text-${index}`))
    const token = match[0]
    if (token.startsWith('**')) {
      const value = token.slice(2, -2)
      nodes.push(value === 'info@tio2malaysia.com'
        ? <a key={index} href="mailto:info@tio2malaysia.com"><strong>{value}</strong></a>
        : <strong key={index}>{value}</strong>)
    } else if (token.startsWith('[')) {
      const parsed = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!
      nodes.push(<a key={index} href={parsed[2]}>{parsed[1]}</a>)
    } else {
      nodes.push(<code key={index}>{token.slice(1, -1)}</code>)
    }
    cursor = index + token.length
  }
  if (cursor < markdown.length) nodes.push(...plainWithBreaks(markdown.slice(cursor).replace(/ {2}\n/g, '\n'), `tail-${cursor}`))
  return nodes
}

function MarkdownBody({markdown}: {readonly markdown: string}) {
  const chunks = markdown.split(/\n{2,}/).filter(Boolean)
  return chunks.map((chunk, index) => {
    const lines = chunk.split('\n')
    if (lines[0]?.startsWith('### ')) return <h3 key={index}>{lines[0].slice(4)}</h3>
    if (lines.every((line) => line.startsWith('- '))) return <ul key={index}>{lines.map((line) => <li key={line}>{inline(line.slice(2))}</li>)}</ul>
    if (lines.length >= 2 && lines[0]?.startsWith('|') && /^\|[\s:|-]+\|$/.test(lines[1]!)) {
      const cells = (line: string) => line.slice(1, -1).split('|').map((cell) => cell.trim())
      const headers = cells(lines[0])
      return <div className={styles.tableWrap} key={index}><table><thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{lines.slice(2).map((line) => <tr key={line}>{cells(line).map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} data-label={headers[cellIndex]}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>
    }
    return <p key={index}>{inline(chunk)}</p>
  })
}

function LegalActions({labels}: {readonly labels: readonly string[]}) {
  return <div className={styles.actions}>{labels.map((label, index) => {
    if (/COOKIE SETTINGS|TETAPAN KUKI/.test(label)) return <MalaysiaCookieSettingsTrigger className={index === 0 ? styles.primary : styles.secondary} key={label}>{label}</MalaysiaCookieSettingsTrigger>
    if (/CONTACT US|HUBUNGI KAMI/.test(label)) return <a className={index === 0 ? styles.primary : styles.secondary} key={label} href="mailto:info@tio2malaysia.com">{label}</a>
    if (/PRIVACY POLICY/.test(label)) return <Link className={index === 0 ? styles.primary : styles.secondary} key={label} href="/privacy-policy/">{label}</Link>
    return null
  })}</div>
}

export function MalaysiaLegalPage({page, structuredData}: Props) {
  const document = parseLegalMarkdown(page.buyerVisibleMarkdown)
  const tocLabel = page.locale === 'ms-MY' ? 'Pada halaman ini' : 'On this page'
  return (
    <div className={styles.site} data-site-scope="tio2-my" data-page-id={page.pageId}>
      {structuredData}
      <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId={page.pageId} sourcePageId={page.pageId} />
      <main className={styles.main} lang={page.locale}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb"><ol>{page.breadcrumb.map((item, index) => <li key={item.href}>{index === page.breadcrumb.length - 1 ? <span aria-current="page">{item.label}</span> : <a href={item.href}>{item.label}</a>}</li>)}</ol></nav>
            <div className={styles.heroGrid}>
              <div><h1>{document.h1}</h1><p className={styles.updated}>{document.updated}</p><MarkdownBody markdown={document.introMarkdown} /><LegalActions labels={document.heroActions} /></div>
              <div className={styles.badge} aria-hidden="true"><strong>{page.badge.label}</strong><span>{page.badge.subLabel}</span></div>
            </div>
          </div>
        </section>
        <div className={styles.readingLayout}>
          <nav className={styles.toc} aria-label={tocLabel}><strong>{tocLabel}</strong><ol>{document.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}</ol></nav>
          <article className={styles.policyBody}>
            {document.sections.map((section, index) => <Fragment key={section.id}>
              <section id={section.id} data-section-order={index + 1}><h2>{section.heading}</h2><MarkdownBody markdown={section.markdown} />{index === document.sections.length - 1 ? <LegalActions labels={document.heroActions} /> : null}</section>
            </Fragment>)}
          </article>
        </div>
      </main>
      <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId={page.pageId} />
    </div>
  )
}
