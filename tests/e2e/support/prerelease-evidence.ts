import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {expect, type Page, type TestInfo} from '@playwright/test'

export const evidenceRoot = resolve(process.env.TIO2_PRERELEASE_EVIDENCE_DIR ?? '.local-evidence/prerelease-manual')
export const commandUuid = process.env.TIO2_PRERELEASE_COMMAND_UUID ?? 'manual-unbound'
export const baseUrl = process.env.TIO2_PRERELEASE_BASE_URL ?? 'http://127.0.0.1:3100'
mkdirSync(evidenceRoot, {recursive: true})

// One immutable fragment per test avoids afterAll races and preserves worker failures/restarts.
export function recordCheck(suite: string, testInfo: TestInfo, externalPostCount = 0) {
  writeFileSync(resolve(evidenceRoot, `${suite}-${randomUUID()}.json`), JSON.stringify({
    suite, commandUuid, externalPostCount,
    checks: [{check: testInfo.title.replace(/[^a-zA-Z0-9_ .:/-]/gu, ''), status: testInfo.status === 'passed' ? 'PASSED' : testInfo.status === 'skipped' ? 'NOT_TESTED' : 'FAILED'}],
  }, null, 2), {flag: 'wx'})
}

export async function capturePublicPage(page: Page, filename: string, errorCount: () => number) {
  // Load lazy assets throughout the page before full-page capture, including the footer logo.
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const step = page.viewportSize()?.height ?? 800
  for (let y = 0; y < height; y += step) {
    await page.evaluate(top => window.scrollTo({top, behavior: 'instant'}), y)
    await page.waitForTimeout(80)
  }
  await expect.poll(() => page.locator('img').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length > 0 && (!(node as HTMLImageElement).complete || (node as HTMLImageElement).naturalWidth === 0)).length)).toBe(0)
  expect(errorCount(), 'browser runtime errors before screenshot').toBe(0)
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}))
  // Only removes the development toolbar from test evidence after runtime checks.
  await page.addStyleTag({content: 'nextjs-portal { display: none !important; }'})
  await page.screenshot({path: resolve(evidenceRoot, filename), fullPage: true, animations: 'disabled'})
}
