import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

import {parseLegalMarkdown} from '@/lib/legal/markdown'
import {normalizeWordPressGmt} from './time'
import type {MalaysiaLegalPageDto, MalaysiaLegalPageSource} from './legal-pages-v01-types'

type UnknownRecord = Record<string, unknown>

export class LegalPagesContractError extends Error {
  constructor(readonly field: string) {
    super(`Invalid Malaysia Legal/Privacy contract field: ${field}`)
    this.name = 'LegalPagesContractError'
  }
}

function record(value: unknown, field: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LegalPagesContractError(field)
  return value as UnknownRecord
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) throw new LegalPagesContractError(field)
  return value
}

export function toMalaysiaLegalPagesDto(values: readonly MalaysiaLegalPageSource[]): readonly MalaysiaLegalPageDto[] {
  if (!Array.isArray(values) || values.length !== 3) throw new LegalPagesContractError('records.cardinality')
  const byPath = new Map<string, MalaysiaLegalPageDto>()

  for (const [index, sourceValue] of values.entries()) {
    const source = record(sourceValue, `records[${index}]`)
    const nodes = record(source.siteScopes, `records[${index}].siteScopes`).nodes
    if (!Array.isArray(nodes)) throw new LegalPagesContractError(`records[${index}].siteScopes`)
    const scopes = nodes.map((node, scopeIndex) => text(record(node, `records[${index}].siteScopes[${scopeIndex}]`).slug, `records[${index}].siteScopes[${scopeIndex}].slug`))
    if (scopes.length !== 1 || scopes[0] !== 'tio2-my') throw new LegalPagesContractError('site_scope=tio2-my')

    const fields = record(source.publishingFields, `records[${index}].publishingFields`)
    const publicPath = text(fields.publicPath, `records[${index}].publicPath`)
    const approvedPage = approved.pages.find((page) => page.path.replace(/\/$/, '') === publicPath)
    if (!approvedPage || byPath.has(approvedPage.path)) throw new LegalPagesContractError(`records[${index}].path`)
    if (source.status !== 'publish') throw new LegalPagesContractError(`records[${index}].status`)
    const modified = normalizeWordPressGmt(typeof source.modifiedGmt === 'string' ? source.modifiedGmt : null)
    if (!modified) throw new LegalPagesContractError(`records[${index}].modified`)
    let stored: unknown
    try { stored = JSON.parse(text(source.malaysiaLegalPageContractJson, `records[${index}].contract`)) } catch { throw new LegalPagesContractError(`records[${index}].contract`) }
    if (JSON.stringify(stored) !== JSON.stringify(approvedPage)) throw new LegalPagesContractError(`records[${index}].contract`)

    const parsed = parseLegalMarkdown(approvedPage.buyerVisibleMarkdown)
    const expectedSections = approvedPage.pageId === 'LEGAL-COOKIE-EN' ? 7 : 10
    if (parsed.sections.length !== expectedSections || approvedPage.releaseState !== approved.releaseState) {
      throw new LegalPagesContractError(`records[${index}].copy`)
    }
    byPath.set(approvedPage.path, {
      ...approvedPage,
      identity: {id: text(source.id, `records[${index}].id`), siteScope: 'tio2-my', status: 'publish', modified},
      globalChrome,
    })
  }

  return Object.freeze(approved.pages.map((page) => {
    const value = byPath.get(page.path)
    if (!value) throw new LegalPagesContractError(`missing:${page.pageId}`)
    return value
  }))
}
