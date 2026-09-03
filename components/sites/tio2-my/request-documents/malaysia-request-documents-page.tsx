import type {ReactNode} from 'react'
import Link from 'next/link'

import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '@/components/sites/tio2-my/malaysia-global-chrome'
import type {MalaysiaRequestDocumentsPrefill} from '@/lib/request-documents/malaysia-request-documents-prefill'
import type {MalaysiaRequestDocumentsPageDto} from '@/lib/wordpress/request-documents-v01-types'

import {MalaysiaRequestDocumentsForm} from './malaysia-request-documents-form'
import styles from './malaysia-request-documents-page.module.css'

interface Props {
  readonly page: MalaysiaRequestDocumentsPageDto
  readonly prefill: MalaysiaRequestDocumentsPrefill
  readonly structuredData: ReactNode
}

export function MalaysiaRequestDocumentsPage({page, prefill, structuredData}: Props) {
  return (
    <div className={styles.site} data-site-scope="tio2-my" data-page-id="CONV-DOC">
      <MalaysiaGlobalHeader chrome={page.globalChrome} currentPageId="CONV-DOC" sourcePageId="CONV-DOC" />
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb" data-module="breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true"> / </span><span aria-current="page">Request Documents</span>
        </nav>

        <section className={styles.hero} aria-labelledby="request-documents-h1" data-module="hero">
          <p className={styles.eyebrow}>{page.hero.eyebrow}</p>
          <h1 id="request-documents-h1">{page.hero.h1}</h1>
          <p>{page.hero.body}</p>
        </section>

        <ol className={styles.steps} aria-label="Document request process" data-module="steps">
          {page.steps.map((step, index) => (
            <li key={step.title}>
              <span aria-hidden="true">{index + 1}</span>
              <div><h2>{step.title}</h2><p>{step.body}</p></div>
            </li>
          ))}
        </ol>

        <aside className={styles.minimumInformation} data-module="minimum-information">
          <span aria-hidden="true">i</span><p>{page.minimumInformation}</p>
        </aside>

        <section className={styles.formSurface} aria-label="Document request form" data-module="request-form">
          <MalaysiaRequestDocumentsForm page={page} prefill={prefill} />
        </section>
      </main>
      <MalaysiaGlobalFooter chrome={page.globalChrome} sourcePageId="CONV-DOC" />
      {structuredData}
    </div>
  )
}
