'use client'

import {useSyncExternalStore, type ReactNode} from 'react'

import {readBrowserQuery} from '@/lib/navigation/browser-query'
import {
  deriveMalaysiaRequestDocumentsTrustedSource,
  resolveMalaysiaRequestDocumentsPrefill,
  type MalaysiaRequestDocumentsPrefill,
} from '@/lib/request-documents/malaysia-request-documents-prefill'
import type {MalaysiaRequestDocumentsPageDto} from '@/lib/wordpress/request-documents-v01-types'

import {MalaysiaRequestDocumentsPage} from './malaysia-request-documents-page'

interface Props {
  readonly page: MalaysiaRequestDocumentsPageDto
  readonly structuredData: ReactNode
}

const EMPTY_BROWSER_CONTEXT = JSON.stringify(['', '', ''])
const subscribeToLocation = () => () => undefined
const getBrowserContext = () => JSON.stringify([
  window.location.search,
  document.referrer,
  window.location.origin,
])
const getServerContext = () => EMPTY_BROWSER_CONTEXT

function resolvePrefill(search = '', referrer?: string, requestOrigin?: string): MalaysiaRequestDocumentsPrefill {
  const query = readBrowserQuery(search)
  const trustedSourcePageId = referrer && requestOrigin
    ? deriveMalaysiaRequestDocumentsTrustedSource(referrer, requestOrigin)
    : null
  return resolveMalaysiaRequestDocumentsPrefill({
    product_grade: query.product_grade ?? query.product,
    application_industry: query.application_industry,
    document_types: query['document_types[]'] ?? query.document_types,
    additional_requirements: query.additional_requirements,
    source_page_id: query.source_page_id,
    source_page: query.source_page,
    market_id: query.market_id,
    country_region: query.country_region,
  }, {trustedSourcePageId})
}

export function MalaysiaRequestDocumentsQueryPage(props: Props) {
  const context = useSyncExternalStore(
    subscribeToLocation,
    getBrowserContext,
    getServerContext,
  )
  const [search, referrer, requestOrigin] = JSON.parse(context) as [string, string, string]
  const prefill = resolvePrefill(search, referrer, requestOrigin)
  return <MalaysiaRequestDocumentsPage key={JSON.stringify(prefill)} {...props} prefill={prefill} />
}
