import {describe, expect, it} from 'vitest'

import {validateMalaysiaLegalReadPage} from '@/lib/wordpress/legal-pages-read-contract'
import {toMalaysiaLegalPagesDto} from '@/lib/wordpress/legal-pages-v01-dto'
import cases from '@/tests/fixtures/legal/read-contract-cases.json'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

type JsonObject = Record<string, unknown>
type JsonPath = readonly (string | number)[]

interface Mutation {
  readonly target: 'source' | 'contract' | 'collection'
  readonly recordIndex?: number
  readonly operation: 'set' | 'delete' | 'repeat' | 'copy'
  readonly path?: JsonPath
  readonly value?: unknown
  readonly count?: number
  readonly fromIndex?: number
  readonly toIndex?: number
}

function sourceRecords(): JsonObject[] {
  return approved.pages.map((page, index) => ({
    id: `legal-${index}`,
    modifiedGmt: '2026-09-13T08:00:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: page.path.replace(/\/$/, '')},
    malaysiaLegalPageContractJson: JSON.stringify(page),
  }))
}

function mutatePath(root: JsonObject, mutation: Mutation) {
  const path = mutation.path ?? []
  let parent: unknown = root
  for (const key of path.slice(0, -1)) parent = (parent as Record<string | number, unknown>)[key]
  const key = path.at(-1)!
  const container = parent as Record<string | number, unknown>
  if (mutation.operation === 'delete') delete container[key]
  else container[key] = mutation.operation === 'repeat'
    ? String(mutation.value).repeat(mutation.count ?? 0)
    : mutation.value
}

function applyCase(mutations: readonly Mutation[]) {
  const records = sourceRecords()
  for (const mutation of mutations) {
    if (mutation.target === 'collection') {
      records[mutation.toIndex!] = structuredClone(records[mutation.fromIndex!]!)
      continue
    }
    const record = records[mutation.recordIndex ?? 0]!
    if (mutation.target === 'source') mutatePath(record, mutation)
    else {
      const contract = JSON.parse(String(record.malaysiaLegalPageContractJson)) as JsonObject
      mutatePath(contract, mutation)
      record.malaysiaLegalPageContractJson = JSON.stringify(contract)
    }
  }
  return records
}

describe('Malaysia legal page read contract', () => {
  it('accepts published content with new headings, date and section count', () => {
    const records = approved.pages.map((page, index) => ({
      id: `legal-${index}`,
      modifiedGmt: '2026-09-13T08:00:00',
      status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-my'}]},
      publishingFields: {publicPath: page.path.replace(/\/$/, '')},
      malaysiaLegalPageContractJson: JSON.stringify({
        ...page,
        effectiveDate: '2026-09-14',
        releaseState: 'cms-reviewed-revision',
        buyerVisibleMarkdown: '# Updated policy\n\n**Last updated: 14 September 2026**\n\nPublished introduction.\n\n## Updated information\n\nPublished body.',
      }),
    }))

    const pages = toMalaysiaLegalPagesDto(records)

    expect(pages[0]!.buyerVisibleMarkdown).toContain('Published body.')
    expect(pages[0]!.effectiveDate).toBe('2026-09-14')
  })

  it.each(cases.cases)('$name', (testCase) => {
    const exercise = () => toMalaysiaLegalPagesDto(applyCase(testCase.mutations as readonly Mutation[]) as never)
    if (testCase.expected === 'reject') {
      expect(exercise).toThrow()
      return
    }

    const pages = exercise()
    expect(JSON.stringify(pages)).toContain(testCase.expectedOutputText)
  })

  it('projects only validated public fields and omits CMS evidence or unknown properties', () => {
    const stored = {
      ...approved.pages[0],
      releaseState: 'cms-reviewed-revision',
      sourceFile: 'historical-evidence.md',
      sourceSha256: 'historical-digest',
      unexpected: 'private CMS value',
    }

    const projected = validateMalaysiaLegalReadPage(stored, '/privacy-policy') as unknown as JsonObject

    expect(projected.buyerVisibleMarkdown).toBe(approved.pages[0]!.buyerVisibleMarkdown)
    expect(projected).not.toHaveProperty('releaseState')
    expect(projected).not.toHaveProperty('sourceFile')
    expect(projected).not.toHaveProperty('sourceSha256')
    expect(projected).not.toHaveProperty('unexpected')
  })
})
