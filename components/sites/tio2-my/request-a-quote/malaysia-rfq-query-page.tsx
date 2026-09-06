'use client'

import {useSyncExternalStore, type ReactNode} from 'react'

import {readBrowserQuery} from '@/lib/navigation/browser-query'
import {resolveMalaysiaRfqPrefill, type MalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import type {MalaysiaRfqPageDto} from '@/lib/wordpress/rfq-page-v01-types'

import {MalaysiaRfqPage} from './malaysia-rfq-page'

interface Props {
  readonly page: MalaysiaRfqPageDto
  readonly receiverAccessKey: string | null
  readonly privacyPolicyHref: string | null
  readonly structuredData: ReactNode
}

const subscribeToLocation = () => () => undefined
const getBrowserSearch = () => window.location.search
const getServerSearch = () => ''

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
  const search = useSyncExternalStore(
    subscribeToLocation,
    getBrowserSearch,
    getServerSearch,
  )
  const prefill = resolvePrefill(search)
  return <MalaysiaRfqPage key={JSON.stringify(prefill)} {...props} prefill={prefill} />
}
