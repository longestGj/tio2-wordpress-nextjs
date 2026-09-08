'use client'

import {useEffect, useSyncExternalStore, type ReactNode} from 'react'

import {readBrowserQuery} from '@/lib/navigation/browser-query'
import {mergeMalaysiaRfqHistoryDraft} from '@/lib/rfq/malaysia-rfq-history'
import {resolveMalaysiaRfqPrefill, type MalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import type {MalaysiaRfqPageDto} from '@/lib/wordpress/rfq-page-v01-types'

import {MALAYSIA_RFQ_PRIVATE_SOURCE_STATE_KEY} from './malaysia-private-rfq-link'
import {MalaysiaRfqPage} from './malaysia-rfq-page'

interface Props {
  readonly page: MalaysiaRfqPageDto
  readonly receiverAccessKey: string | null
  readonly privacyPolicyHref: string | null
  readonly structuredData: ReactNode
}

const RFQ_EMPTY_BROWSER_CONTEXT = JSON.stringify(['', null, null])
const subscribeToLocation = (callback: () => void) => {
  window.addEventListener('popstate', callback)
  window.addEventListener('pageshow', callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener('pageshow', callback)
  }
}
const getBrowserContext = () => JSON.stringify([
  window.location.search,
  window.history.state?.tio2MyRfqDraft ?? null,
  window.history.state?.[MALAYSIA_RFQ_PRIVATE_SOURCE_STATE_KEY] ??
    window.sessionStorage.getItem(MALAYSIA_RFQ_PRIVATE_SOURCE_STATE_KEY),
])
const getServerContext = () => RFQ_EMPTY_BROWSER_CONTEXT

function resolvePrefill(search = ''): MalaysiaRfqPrefill {
  const query = readBrowserQuery(search)
  return resolveMalaysiaRfqPrefill({
    market: query.market,
    source_page: query.source_page,
    interest: query.interest,
    grade_id: query.grade_id,
    application_id: query.application_id,
    destination_country: query.destination_country,
    market_id: query.market_id,
    process_context: query.process_context,
    document_needs: query['document_needs[]'] ?? query.document_needs,
    resource_context: query.resource_context,
    source_page_id: query.source_page_id,
  })
}

export function MalaysiaRfqQueryPage(props: Props) {
  const context = useSyncExternalStore(
    subscribeToLocation,
    getBrowserContext,
    getServerContext,
  )
  const [search, draft, privateSource] = JSON.parse(context) as [string, unknown, unknown]
  const publicPrefill = resolvePrefill(search)
  useEffect(() => {
    if (typeof privateSource !== 'string') return
    window.sessionStorage.removeItem(MALAYSIA_RFQ_PRIVATE_SOURCE_STATE_KEY)
    if (publicPrefill.sourcePageId) return
    const state = window.history.state && typeof window.history.state === 'object'
      ? {...window.history.state}
      : {}
    window.history.replaceState({
      ...state,
      [MALAYSIA_RFQ_PRIVATE_SOURCE_STATE_KEY]: privateSource,
    }, '', window.location.href)
  }, [privateSource, publicPrefill.sourcePageId])
  const prefill = mergeMalaysiaRfqHistoryDraft(
    publicPrefill.sourcePageId || typeof privateSource !== 'string'
      ? publicPrefill
      : resolveMalaysiaRfqPrefill({source_page_id: privateSource}),
    draft,
  )
  return <MalaysiaRfqPage key={JSON.stringify(prefill)} {...props} prefill={prefill} />
}
