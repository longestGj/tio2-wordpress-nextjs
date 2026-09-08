import type {ReactNode} from 'react'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '@/components/sites/tio2-my/malaysia-global-chrome'
import type {MalaysiaDocumentCooDto} from '@/lib/wordpress/document-coo-v04-types'

import styles from './document-coo-page.module.css'

interface Props {
  readonly page: MalaysiaDocumentCooDto
  readonly structuredData: ReactNode
}

type Hero = {id: string; eyebrow: string; h1: string; paragraphs: readonly string[]; productHubLinkText: string; productHubHref: string; action: {label: string; href: string}}
type Evidence = {id: string; h2: string; intro: string; columns: readonly string[]; rows: readonly (readonly string[])[]; closing: string; guidanceLinkText: string; guidanceText: string}
type Details = {id: string; h2: string; intro: string; details: readonly (readonly string[])[]; paragraphs: readonly string[]}
type TextSection = {id: string; h2: string; paragraphs: readonly string[]}
type Prepare = {id: string; h2: string; intro: string; items: readonly string[]; paragraphs: readonly string[]; action: {label: string; href: string}; documentsLink: {label: string; href: string}}
type Official = {id: string; h2: string; sourceLead: string; sourceLinkText: string; sourceTail: string; lastReviewed: string; limitation: string}

function paragraphWithLink(text: string, linkText: string, href: string) {
  const [before = '', after = ''] = text.split(linkText)
  return <>{before}<a href={href}>{linkText}</a>{after}</>
}

export function MalaysiaDocumentCooPage({page, structuredData}: Props) {
  const [hero, evidence, details, distinction, prepare, official] = page.sections as unknown as readonly [Hero, Evidence, Details, TextSection, Prepare, Official]
  return <div className={styles.site} data-site-scope="tio2-my" data-page-id="DOC-COO">
    <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="DOC-000" sourcePageId="DOC-COO" />
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        {page.breadcrumb.map((item, index) => <span key={item.label}>
          {index ? <span aria-hidden="true">/</span> : null}
          {index === page.breadcrumb.length - 1
            ? <span aria-current="page">{item.label}</span>
            : <a href={item.href}>{item.label}</a>}
        </span>)}
      </nav>

      <section id={hero.id} className={styles.hero}>
        <p className={styles.eyebrow}>{hero.eyebrow}</p>
        <h1>{hero.h1}</h1>
        <p>{hero.paragraphs[0]}</p>
        <p>{paragraphWithLink(hero.paragraphs[1] ?? '', hero.productHubLinkText, hero.productHubHref)}</p>
        <p><a className={styles.primary} href={hero.action.href}>{hero.action.label}</a></p>
      </section>

      <section id={evidence.id}>
        <h2>{evidence.h2}</h2>
        <p>{evidence.intro}</p>
        <table className={styles.evidenceTable}>
          <thead><tr>{evidence.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
          <tbody>{evidence.rows.map((row) => <tr key={row[0]}>
            <th scope="row"><span className={styles.cellLabel} aria-hidden="true">{evidence.columns[0]}</span><span className={styles.cellValue}>{row[0]}</span></th>
            <td><span className={styles.cellLabel} aria-hidden="true">{evidence.columns[1]}</span><span className={styles.cellValue}>{row[1]}</span></td>
            <td><span className={styles.cellLabel} aria-hidden="true">{evidence.columns[2]}</span><span className={styles.cellValue}>{row[2]}</span></td>
          </tr>)}</tbody>
        </table>
        <p>{evidence.closing} <a className={styles.officialSourceLink} href={page.source.url}>{evidence.guidanceLinkText}</a> {evidence.guidanceText}</p>
      </section>

      <section id={details.id}>
        <h2>{details.h2}</h2>
        <p>{details.intro}</p>
        <ol className={styles.contextList}>{details.details.map(([label, body]) => <li key={label}><strong>{label}</strong> {body}</li>)}</ol>
        {details.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>

      <section id={distinction.id}>
        <h2>{distinction.h2}</h2>
        {distinction.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>

      <section id={prepare.id}>
        <h2>{prepare.h2}</h2>
        <p>{prepare.intro}</p>
        <ul className={styles.prepareList}>{prepare.items.map((item) => <li key={item}>{item}</li>)}</ul>
        <p>{prepare.paragraphs[0]}</p>
        <p>{prepare.paragraphs[1]}</p>
        <p><a className={styles.primary} href={prepare.action.href}>{prepare.action.label}</a></p>
        <p>{prepare.paragraphs[2]}</p>
        <p><a href={prepare.documentsLink.href}>{prepare.documentsLink.label}</a></p>
      </section>

      <section id={official.id}>
        <h2>{official.h2}</h2>
        <p>{official.sourceLead} <a className={styles.officialSourceLink} href={page.source.url}>{official.sourceLinkText}</a>. {official.sourceTail}</p>
        <p><strong>Last reviewed:</strong> {official.lastReviewed}</p>
        <p>{official.limitation}</p>
      </section>
    </main>
    {structuredData}
    <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="DOC-COO" />
  </div>
}
