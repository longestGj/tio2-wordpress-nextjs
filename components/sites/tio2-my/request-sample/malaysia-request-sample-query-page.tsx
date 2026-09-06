'use client'

import {useSyncExternalStore, type ReactNode} from 'react'

import {readBrowserQuery} from '@/lib/navigation/browser-query'
import {resolveMalaysiaSamplePrefill, type MalaysiaSamplePrefill} from '@/lib/request-sample/malaysia-request-sample-prefill'
import type {MalaysiaRequestSamplePageDto} from '@/lib/wordpress/request-sample-v01-types'

import {MalaysiaRequestSamplePage} from './malaysia-request-sample-page'

interface Props {
  readonly page: MalaysiaRequestSamplePageDto
  readonly receiverReady: boolean
  readonly structuredData: ReactNode
}

const subscribeToLocation = () => () => undefined
const getBrowserSearch = () => window.location.search
const getServerSearch = () => ''

function resolvePrefill(search = ''): MalaysiaSamplePrefill {
  const query = readBrowserQuery(search)
  return resolveMalaysiaSamplePrefill({
    source_page_id: query.source_page_id,
    grade_id: query.grade_id,
    application_id: query.application_id,
    process_context: query.process_context,
    market_id: query.market_id,
    destination: query.destination,
    document_needs: query['document_needs[]'] ?? query.document_needs,
    resource_context: query.resource_context,
  })
}

export function MalaysiaRequestSampleQueryPage(props: Props) {
  const search = useSyncExternalStore(
    subscribeToLocation,
    getBrowserSearch,
    getServerSearch,
  )
  const prefill = resolvePrefill(search)
  return <MalaysiaRequestSamplePage key={JSON.stringify(prefill)} {...props} prefill={prefill} />
}
