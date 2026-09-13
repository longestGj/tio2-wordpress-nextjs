import {spawnSync} from 'node:child_process'
import {describe, expect, it} from 'vitest'

import {toMalaysiaLegalPagesDto} from '@/lib/wordpress/legal-pages-v01-dto'
import cases from '@/tests/fixtures/legal/read-contract-cases.json'
import {isolatedPhpArgs} from '@/tests/helpers/wordpress-test-support'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

interface HarnessResult {
  readonly phpVersion: string
  readonly intl: boolean
  readonly mbstring: boolean
  readonly caseCount: number
  readonly accepted: number
  readonly rejected: number
  readonly acceptedResolverRecords: unknown
}

function runPhpHarness(): HarnessResult {
  const result = spawnSync('docker', [
    ...isolatedPhpArgs(process.cwd()),
    '/workspace/tests/infrastructure/php/legal-read-contract.php',
    '--json',
  ], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024})
  if (result.status !== 0) {
    throw new Error(`PHP legal read harness failed (${result.status}):\n${result.stdout}\n${result.stderr}`)
  }
  return JSON.parse(result.stdout) as HarnessResult
}

describe('PHP Malaysia legal read contract integration', () => {
  it('feeds every shared vector through the real resolver and accepted output into the real DTO', () => {
    const harness = runPhpHarness()

    expect(harness.phpVersion).toMatch(/^8\.3\./u)
    expect(harness.intl).toBe(true)
    expect(harness.mbstring).toBe(true)
    expect(harness.caseCount).toBe(cases.cases.length)
    expect(harness.accepted + harness.rejected).toBe(cases.cases.length)

    const pages = toMalaysiaLegalPagesDto(harness.acceptedResolverRecords as never)
    expect(pages[0]!.buyerVisibleMarkdown).toContain('Published body.')
    expect(pages[0]!).not.toHaveProperty('releaseState')
    expect(pages[0]!).not.toHaveProperty('sourceFile')
    expect(pages[0]!).not.toHaveProperty('sourceSha256')
    expect(JSON.stringify(pages[0])).not.toContain('must not be projected')
  })
})
