import {parseLegalMarkdown} from '@/lib/legal/markdown'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-read-contract.json'

import type {MalaysiaLegalPageContent} from './legal-pages-v01-types'

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

const forbiddenControls = /[\u0000-\u001f\u007f]/u
const forbiddenMarkdownControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u

function text(value: unknown, field: string, controls = forbiddenControls): string {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.trim() !== value
    || [...value].length > contract.maximumTextCodePoints
    || controls.test(value)
    || /[<>]/u.test(value)
  ) throw new LegalPagesContractError(field)
  return value
}

function expected<T>(value: unknown, expectedValue: T, field: string): T {
  if (value !== expectedValue) throw new LegalPagesContractError(field)
  return expectedValue
}

function effectiveDate(value: unknown): string {
  const result = text(value, 'effectiveDate')
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(result)
  if (!match) throw new LegalPagesContractError('effectiveDate')
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > monthDays[month - 1]!) {
    throw new LegalPagesContractError('effectiveDate')
  }
  return result
}

export const MALAYSIA_LEGAL_READ_PAGES = contract.routes

export function validateMalaysiaLegalReadPage(value: unknown, publicPath: string): MalaysiaLegalPageContent {
  const page = record(value, 'contract')
  const registered = contract.routes.find((candidate) => candidate.path.replace(/\/$/, '') === publicPath)
  if (!registered) throw new LegalPagesContractError('path')
  expected(page.pageId, registered.pageId, 'pageId')
  expected(page.routeKey, registered.routeKey, 'routeKey')
  expected(page.path, registered.path, 'path')
  expected(page.locale, registered.locale, 'locale')
  expected(page.pageType, contract.pageType, 'pageType')
  expected(page.headerCurrentKey, contract.headerCurrentKey, 'headerCurrentKey')

  const breadcrumbValue = page.breadcrumb
  if (!Array.isArray(breadcrumbValue) || breadcrumbValue.length !== registered.breadcrumbHrefs.length) {
    throw new LegalPagesContractError('breadcrumb')
  }
  const breadcrumb = breadcrumbValue.map((item, index) => {
    const entry = record(item, `breadcrumb[${index}]`)
    return {
      label: text(entry.label, `breadcrumb[${index}].label`),
      href: expected(entry.href, registered.breadcrumbHrefs[index], `breadcrumb[${index}].href`),
    }
  }) as MalaysiaLegalPageContent['breadcrumb']

  const badgeValue = record(page.badge, 'badge')
  const badge = {
    label: text(badgeValue.label, 'badge.label'),
    subLabel: text(badgeValue.subLabel, 'badge.subLabel'),
  }
  const markdown = text(page.buyerVisibleMarkdown, 'buyerVisibleMarkdown', forbiddenMarkdownControls)
  try { parseLegalMarkdown(markdown) } catch { throw new LegalPagesContractError('buyerVisibleMarkdown') }

  const seoValue = record(page.seo, 'seo')
  const seo = {
    title: text(seoValue.title, 'seo.title'),
    description: text(seoValue.description, 'seo.description'),
    canonical: expected(seoValue.canonical, `${contract.origin}${registered.path}`, 'seo.canonical'),
    primaryKeyword: text(seoValue.primaryKeyword, 'seo.primaryKeyword'),
  }

  return {
    pageId: registered.pageId as MalaysiaLegalPageContent['pageId'],
    routeKey: registered.routeKey as MalaysiaLegalPageContent['routeKey'],
    path: registered.path as MalaysiaLegalPageContent['path'],
    locale: registered.locale as MalaysiaLegalPageContent['locale'],
    pageType: 'legal_policy',
    headerCurrentKey: null,
    effectiveDate: effectiveDate(page.effectiveDate),
    breadcrumb,
    badge,
    buyerVisibleMarkdown: markdown,
    seo,
  }
}
