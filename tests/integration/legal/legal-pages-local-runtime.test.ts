import {execFile, spawn, type ChildProcess} from 'node:child_process'
import {randomBytes, randomUUID} from 'node:crypto'
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {dirname, resolve} from 'node:path'
import {promisify} from 'node:util'
import {chromium, expect as playwrightExpect, type Browser, type Page} from '@playwright/test'
import {describe, expect, it} from 'vitest'

import {startIsolatedWordPress, type OwnedWordPressRuntime} from '../../helpers/wordpress-runtime'
import {prepareLegalReadFixture, runLegalCleanupSteps, unexpectedLegalBrowserDiagnostics} from '../../helpers/legal-read-runtime-fixture'
// @ts-expect-error -- Runtime leases are intentionally delivered as an MJS script.
import {attachLease, releaseLease, reserveLease} from '../../../scripts/runtime-ports/lease-core.mjs'

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, '../../..')
const fixtureTemplateRoot = resolve(repositoryRoot, 'tests/fixtures/legal-read-runtime')
const canonicalRequire = createRequire(resolve(repositoryRoot, '../../package.json'))
const nextBin = canonicalRequire.resolve('next/dist/bin/next')
const runLiveRuntime = process.env.LEGAL_READ_LOCAL_RUNTIME === '1'
export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: true} as const

async function closedLoopbackPort() {
  const server = createServer()
  await new Promise<void>((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to allocate closed callback port')
  await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()))
  return address.port
}

async function waitForNext(baseUrl: string, child: ChildProcess, logs: () => string) {
  const deadline = Date.now() + 60_000
  for (;;) {
    if (child.exitCode !== null) throw new Error(`Next exited during startup (${child.exitCode})\n${logs()}`)
    try {
      const probe = await execFileAsync('curl.exe', ['--noproxy', '*', '--silent', '--show-error', '--output', 'NUL', '--write-out', '%{http_code}', `${baseUrl}/privacy-policy/`], {
        encoding: 'utf8', timeout: 5_000,
      })
      if (probe.stdout.trim() === '200') return
    } catch {}
    if (Date.now() >= deadline) throw new Error(`Next did not become ready\n${logs()}`)
    await new Promise(done => setTimeout(done, 250))
  }
}

async function stopNext(child: ChildProcess) {
  if (child.exitCode !== null) return
  child.kill()
  await Promise.race([
    new Promise<void>(done => child.once('exit', () => done())),
    new Promise<never>((_done, reject) => setTimeout(() => reject(new Error('Next did not stop within 10 seconds')), 10_000)),
  ])
}

function recordBrowserDiagnostics(page: Page, diagnostics: string[]) {
  page.on('console', message => {if (message.type() === 'error') diagnostics.push(`console:error:${message.text()}`)})
  page.on('pageerror', error => diagnostics.push(`pageerror:${error.message}`))
  page.on('requestfailed', request => diagnostics.push(`requestfailed:${request.url()}:${request.failure()?.errorText ?? 'unknown'}`))
  page.on('response', response => {
    if (response.status() >= 400) diagnostics.push(`response:${response.status()}:${response.url()}`)
  })
}

describe.runIf(runLiveRuntime)('isolated WordPress to legal-only Next build acceptance', () => {
  it('renders changed CMS legal records, metadata, anchors and consent controls', async () => {
    const runId = `legal-read-${randomUUID()}`
    const runtimeRoot = resolve(repositoryRoot, '.tmp/cms-read-decoupling-legal')
    const runDirectory = resolve(runtimeRoot, runId)
    if (dirname(runDirectory) !== runtimeRoot) throw new Error('Legal runtime directory escaped its owned root')
    const fixtureRoot = resolve(runDirectory, 'next')
    const evidenceDirectory = resolve(repositoryRoot, '.local-evidence/cms-read-decoupling-legal', runId)
    const distDir = '.next'
    const callbackPort = await closedLoopbackPort()
    const callback = `http://127.0.0.1:${callbackPort}/closed-local-test-endpoint`
    const secret = () => randomBytes(32).toString('hex')
    const environmentPath = resolve(runDirectory, 'wordpress.env')
    mkdirSync(runDirectory, {recursive: true})
    mkdirSync(evidenceDirectory, {recursive: true})
    const environmentContent = [
      'WORDPRESS_DB_NAME=legal_runtime',
      'WORDPRESS_DB_USER=legal_runtime',
      `WORDPRESS_DB_PASSWORD=${secret()}`,
      `WORDPRESS_DB_ROOT_PASSWORD=${secret()}`,
      'WORDPRESS_ADMIN_USER=legal-runtime-editor',
      `WORDPRESS_ADMIN_PASSWORD=${secret()}`,
      'WORDPRESS_ADMIN_EMAIL=legal-runtime@example.invalid',
      ...['A', 'B', 'MY'].flatMap(site => [
        `NEXTJS_REVALIDATION_URL_TIO2_${site}=${callback}`,
        `NEXTJS_REVALIDATION_SECRET_TIO2_${site}=${secret()}`,
        `NEXTJS_PREVIEW_URL_TIO2_${site}=${callback}`,
        `NEXTJS_PREVIEW_SECRET_TIO2_${site}=${secret()}`,
      ]),
    ].join('\n')

    const commit = (await execFileAsync('git', ['rev-parse', 'HEAD'], {cwd: repositoryRoot, encoding: 'utf8'})).stdout.trim()
    let wordpress: OwnedWordPressRuntime | undefined
    let nextProcess: ChildProcess | undefined
    let browser: Browser | undefined
    let nextLease: {leaseId: string; ports: number[]; processIds: number[]} | undefined
    let nextLogs = ''
    let acceptancePassed = false
    let nextStopped = false
    let nextLeaseReleased = false
    let wordpressStopped = false
    const browserDiagnostics: string[] = []
    let acceptanceError: unknown
    try {
      writeFileSync(environmentPath, environmentContent)
      prepareLegalReadFixture(fixtureTemplateRoot, runDirectory, repositoryRoot)

      wordpress = await startIsolatedWordPress({
        ...WORDPRESS_RUNTIME_MODE, runId: runId, siteId: 'tio2-my', worktree: repositoryRoot, commit: commit,
        environment: {...process.env, TIO2_TEST_WORDPRESS_ENV: environmentPath},
      })
      if (!wordpress.graphqlUrl) throw new Error('Owned WordPress did not publish GraphQL')
      const wordpressOrigin = new URL('/', wordpress.graphqlUrl).origin
      await wordpress.wp(['core', 'install', `--url=${wordpressOrigin}`, '--title=Legal Runtime', '--admin_user=legal-runtime-editor', '--admin_email=legal-runtime@example.invalid', '--skip-email', `--admin_password=${secret()}`])
      await wordpress.wpAsWebUser(['plugin', 'install', 'wp-graphql', '--activate'])
      await wordpress.wp(['plugin', 'activate', 'tio2-site-model'])
      await wordpress.wp(['eval-file', '/workspace/wordpress/seed/apply-tio2-my-legal-pages.php'])
      const mutationResult = JSON.parse(await wordpress.wp(['eval-file', '/workspace/tests/fixtures/legal-read-runtime/apply-synthetic-legal-content.php'])) as {status: string; records: unknown[]}
      expect(mutationResult).toMatchObject({status: 'passed'})
      expect(mutationResult.records).toHaveLength(3)

      const graphResponse = await execFileAsync('curl.exe', [
        '--noproxy', '*', '--silent', '--show-error', '--fail-with-body',
        '--header', 'content-type: application/json', '--data', JSON.stringify({query: '{ malaysiaLegalPagesRecordJson }'}),
        wordpress.graphqlUrl,
      ], {cwd: repositoryRoot, encoding: 'utf8', timeout: 30_000})
      const graphBody = JSON.parse(graphResponse.stdout) as {data?: {malaysiaLegalPagesRecordJson?: string}; errors?: unknown[]}
      expect(graphBody.errors).toBeUndefined()
      const graphRecords = JSON.parse(graphBody.data?.malaysiaLegalPagesRecordJson ?? 'null') as Array<{malaysiaLegalPageContractJson: string}>
      expect(graphRecords).toHaveLength(3)
      const graphContracts = graphRecords.map(record => JSON.parse(record.malaysiaLegalPageContractJson) as {buyerVisibleMarkdown: string; seo: {title: string}})
      expect(graphContracts.map(record => record.seo.title)).toEqual([
        'Runtime Updated Privacy SEO', 'SEO Dasar Privasi Runtime', 'Runtime Updated Cookie SEO',
      ])
      expect(graphContracts.map(record => record.buyerVisibleMarkdown.split('\n')[0])).toEqual([
        '# Runtime Updated Privacy Policy', '# Dasar Privasi Runtime Dikemas Kini', '# Runtime Updated Cookie Policy',
      ])
      expect(graphContracts.every(record => record.buyerVisibleMarkdown.includes('### Runtime published subsection'))).toBe(true)

      const buildEnvironment = {
        ...process.env,
        SITE_ID: 'tio2-my',
        WORDPRESS_GRAPHQL_URL: wordpress.graphqlUrl,
        NEXT_DIST_DIR: distDir,
        LEGAL_READ_CANONICAL_WORKSPACE_ROOT: resolve(repositoryRoot, '../..'),
      }
      let build: {stdout: string; stderr: string}
      try {
        build = await execFileAsync(process.execPath, [nextBin, 'build'], {
          cwd: fixtureRoot, env: buildEnvironment, encoding: 'utf8', timeout: 600_000, maxBuffer: 16 * 1024 * 1024,
        })
      } catch (error) {
        const failed = error as Error & {stdout?: string; stderr?: string}
        const diagnostic = `${failed.message}\n${failed.stdout ?? ''}\n${failed.stderr ?? ''}`
        writeFileSync(resolve(evidenceDirectory, 'target-route-build-failure.log'), diagnostic)
        throw new Error(diagnostic)
      }
      writeFileSync(resolve(evidenceDirectory, 'target-route-build.log'), `${build.stdout}\n${build.stderr}`)
      const buildId = readFileSync(resolve(fixtureRoot, distDir, 'BUILD_ID'), 'utf8').trim()

      const reservedNextLease = await reserveLease({runId, purpose: 'test-next', siteId: 'tio2-my', worktree: repositoryRoot, commit})
      nextLease = reservedNextLease
      const nextPort = reservedNextLease.ports[0]!
      const baseUrl = `http://127.0.0.1:${nextPort}`
      nextProcess = spawn(process.execPath, [nextBin, 'start', '--hostname', '127.0.0.1', '--port', String(nextPort)], {
        cwd: fixtureRoot, env: buildEnvironment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      })
      if (!nextProcess.pid) throw new Error('Next process did not expose a PID')
      nextProcess.stdout?.on('data', chunk => { nextLogs += String(chunk) })
      nextProcess.stderr?.on('data', chunk => { nextLogs += String(chunk) })
      const attachedNextLease = await attachLease({leaseId: reservedNextLease.leaseId, processId: nextProcess.pid})
      nextLease = attachedNextLease
      await waitForNext(baseUrl, nextProcess, () => nextLogs)

      browser = await chromium.launch()
      const pages = [
        {slug: 'privacy-en', path: '/privacy-policy/', h1: 'Runtime Updated Privacy Policy', title: 'Runtime Updated Privacy SEO', description: 'Runtime published English privacy description.', body: 'Runtime published English body without a blank separator.', lang: 'en'},
        {slug: 'privacy-ms', path: '/ms/privacy-policy/', h1: 'Dasar Privasi Runtime Dikemas Kini', title: 'SEO Dasar Privasi Runtime', description: 'Penerangan privasi runtime yang diterbitkan.', body: 'Kandungan Bahasa Malaysia runtime yang diterbitkan tanpa pemisah kosong.', lang: 'ms-MY'},
        {slug: 'cookie-en', path: '/cookie-policy/', h1: 'Runtime Updated Cookie Policy', title: 'Runtime Updated Cookie SEO', description: 'Runtime published cookie description.', body: 'Runtime published cookie body without a blank separator.', lang: 'en'},
      ] as const
      for (const entry of pages) {
        for (const viewport of [{name: 'desktop', width: 1440, height: 1000}, {name: 'mobile', width: 390, height: 844}] as const) {
          const page = await browser.newPage({viewport: {width: viewport.width, height: viewport.height}})
          recordBrowserDiagnostics(page, browserDiagnostics)
          await page.route('https://www.googletagmanager.com/**', route => route.fulfill({status: 200, body: ''}))
          const response = await page.goto(`${baseUrl}${entry.path}`, {waitUntil: 'domcontentloaded'})
          expect(response?.ok()).toBe(true)
          await playwrightExpect(page.locator('main')).toHaveAttribute('lang', entry.lang)
          await playwrightExpect(page.getByRole('heading', {level: 1})).toHaveText(entry.h1)
          await playwrightExpect(page.getByText(entry.body)).toBeVisible()
          await playwrightExpect(page.locator('meta[name="description"]')).toHaveAttribute('content', entry.description)
          await playwrightExpect(page).toHaveTitle(entry.title)
          await playwrightExpect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
          await page.screenshot({path: resolve(evidenceDirectory, `${entry.slug}-${viewport.name}-viewport.png`), animations: 'disabled'})
          const section = page.locator('main article > section').first()
          const anchor = await section.getAttribute('id')
          expect(anchor).toBeTruthy()
          await page.locator(`nav a[href="#${anchor}"]`).click()
          await playwrightExpect(page).toHaveURL(new RegExp(`#${anchor}$`, 'u'))
          await page.screenshot({path: resolve(evidenceDirectory, `${entry.slug}-${viewport.name}.png`), fullPage: true, animations: 'disabled'})
          await page.close()
        }
      }

      const consentPage = await browser.newPage({viewport: {width: 390, height: 844}})
      recordBrowserDiagnostics(consentPage, browserDiagnostics)
      await consentPage.route('https://www.googletagmanager.com/**', route => route.fulfill({status: 200, body: ''}))
      await consentPage.goto(`${baseUrl}/cookie-policy/`, {waitUntil: 'domcontentloaded'})
      const menuTrigger = consentPage.locator('button[aria-controls="malaysia-mobile-menu"]')
      await menuTrigger.click()
      await playwrightExpect(menuTrigger).toHaveAttribute('aria-expanded', 'true')
      await consentPage.getByRole('button', {name: 'Close primary navigation menu'}).click()
      await playwrightExpect(menuTrigger).toHaveAttribute('aria-expanded', 'false')
      const consentTrigger = consentPage.locator('footer').getByRole('button', {name: 'Cookie Settings'})
      const consentDialog = consentPage.getByRole('dialog', {name: 'Cookie settings'})
      await consentTrigger.click()
      await playwrightExpect(consentDialog).toBeVisible()
      await playwrightExpect(consentDialog.getByText('Optional Analytics is not active in this runtime.')).toBeVisible()
      expect(await consentPage.evaluate(() => localStorage.getItem('tio2_my_consent_v1'))).toBeNull()
      await consentPage.screenshot({path: resolve(evidenceDirectory, 'cookie-en-mobile-consent-dialog.png'), animations: 'disabled'})
      await consentPage.keyboard.press('Escape')
      await playwrightExpect(consentTrigger).toBeFocused()
      await consentPage.close()

      expect(unexpectedLegalBrowserDiagnostics(browserDiagnostics, baseUrl)).toEqual([])

      writeFileSync(resolve(evidenceDirectory, 'runtime-evidence.json'), JSON.stringify({
        runId, branch: 'codex/cms-read-approval-decoupling', commit, buildId,
        buildScope: 'representative legal-only target-route production build',
        wordpress: {projectName: wordpress.projectName, graphqlUrl: wordpress.graphqlUrl, dataMode: 'isolated'},
        next: {baseUrl, leaseId: attachedNextLease.leaseId, processId: nextProcess.pid},
        callbacks: {origin: `http://127.0.0.1:${callbackPort}`, state: 'closed-local-test-endpoint'},
        screenshots: [
          ...pages.flatMap(entry => ['desktop', 'mobile'].flatMap(viewport => [
            `${entry.slug}-${viewport}.png`, `${entry.slug}-${viewport}-viewport.png`,
          ])),
          'cookie-en-mobile-consent-dialog.png',
        ],
      }, null, 2))
      acceptancePassed = true
    } catch (error) {
      acceptanceError = error
    } finally {
      const cleanupErrors = await runLegalCleanupSteps([
        {name: 'browser close', run: async () => {await browser?.close()}},
        {name: 'diagnostic logs', run: () => {
          writeFileSync(resolve(evidenceDirectory, 'browser-diagnostics.log'), browserDiagnostics.join('\n'))
          writeFileSync(resolve(evidenceDirectory, 'next-runtime.log'), nextLogs)
        }},
        {name: 'Next stop', run: async () => {
          if (nextProcess) await stopNext(nextProcess)
          nextStopped = true
        }},
        {name: 'Next lease release', run: async () => {
          if (!nextStopped && nextLease) throw new Error('Next process may still run; lease retained')
          if (nextLease) await releaseLease({leaseId: nextLease.leaseId, expectedProcessIds: nextLease.processIds})
          nextLeaseReleased = true
        }},
        {name: 'WordPress stop', run: async () => {
          await wordpress?.stop()
          wordpressStopped = true
        }},
        {name: 'owned run directory', run: () => {
          if (!nextStopped || !nextLeaseReleased || !wordpressStopped) throw new Error('Owned service or lease may still need fixture files; run directory retained')
          rmSync(runDirectory, {recursive: true, force: false})
        }},
        {name: 'cleanup evidence', run: () => writeFileSync(resolve(evidenceDirectory, 'cleanup-evidence.json'), JSON.stringify({
          runId, acceptancePassed, nextStopped, nextLeaseReleased, wordpressStopped,
          fixtureBuildRemoved: !existsSync(resolve(fixtureRoot, distDir)),
          fixturePublicJunctionRemoved: !existsSync(resolve(fixtureRoot, 'public')),
          syntheticEnvironmentRemoved: !existsSync(runDirectory),
        }, null, 2))},
      ])
      if (cleanupErrors.length) throw new AggregateError(
        acceptanceError ? [acceptanceError, ...cleanupErrors] : cleanupErrors,
        'Legal runtime acceptance or cleanup failed; inspect retained run identity and evidence',
      )
      if (acceptanceError) throw acceptanceError
    }
  }, 900_000)
})
